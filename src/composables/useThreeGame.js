import * as THREE from 'three'
import { ref } from 'vue'
import { createPlayer } from '../game/Player'
import { createObstacle } from '../game/Obstacle'

export function useThreeGame(canvasRef) {
  // Estado para Vue (HUD)
  const score = ref(0)
  const best = ref(Number(localStorage.getItem('bestScore') ?? 0))
  const speed = ref(7) // unidades/segundo
  const isGameOver = ref(false)

  // Three.js
  let scene, camera, renderer
  let animationId = null
  let clock = null

  // Entidades
  let player = null
  const obstacles = []

  // Suelo/pista
  let ground = null

  // Input
  const keys = new Set()

  // Timers de spawn
  let obstacleTimer = 0

  // Config juego
  const LANES = [-2, 0, 2]
  const SPAWN_Z = -35
  const DESPAWN_Z = 10
  const PLAYER_Z = 0

  // Física simple salto
  const GRAVITY = -20
  const JUMP_V = 9.5

  // Colisiones
  const playerBox = new THREE.Box3()
  const tempBox = new THREE.Box3()

  function initThree() {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x101018)
    scene.fog = new THREE.Fog(0x101018, 12, 55)

    const w = window.innerWidth
    const h = window.innerHeight

    camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 200)
    camera.position.set(0, 4.2, 8)
    camera.lookAt(0, 1, -6)

    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      antialias: true
    })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))

    const dir = new THREE.DirectionalLight(0xffffff, 1.1)
    dir.position.set(6, 10, 6)
    dir.castShadow = true
    dir.shadow.mapSize.width = 1024
    dir.shadow.mapSize.height = 1024
    scene.add(dir)

    // Suelo / pista
    const groundGeo = new THREE.BoxGeometry(8, 0.3, 80)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.9 })
    ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.set(0, -0.15, -20)
    ground.receiveShadow = true
    scene.add(ground)

    // Líneas laterales (visual)
    const railGeo = new THREE.BoxGeometry(0.15, 0.4, 80)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x5a5aff, roughness: 0.6 })
    const leftRail = new THREE.Mesh(railGeo, railMat)
    const rightRail = new THREE.Mesh(railGeo, railMat)
    leftRail.position.set(-4, 0.1, -20)
    rightRail.position.set(4, 0.1, -20)
    leftRail.receiveShadow = true
    rightRail.receiveShadow = true
    scene.add(leftRail, rightRail)

    // Jugador
    player = createPlayer()
    player.castShadow = true
    player.position.z = PLAYER_Z
    scene.add(player)

    clock = new THREE.Clock()

    // Eventos
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  }

  function onResize() {
    if (!renderer || !camera) return
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  function onKeyDown(e) {
    keys.add(e.code)

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveLane(-1)
    if (e.code === 'ArrowRight' || e.code === 'KeyD') moveLane(1)
    if (e.code === 'Space') jump()
  }

  function onKeyUp(e) {
    keys.delete(e.code)
  }

  function moveLane(dir) {
    if (!player || isGameOver.value) return
    const currentX = player.userData.targetX
    const laneIndex = LANES.indexOf(currentX)
    const nextIndex = THREE.MathUtils.clamp(laneIndex + dir, 0, LANES.length - 1)
    player.userData.targetX = LANES[nextIndex]
  }

  function jump() {
    if (!player || isGameOver.value) return
    if (player.userData.isJumping) return
    player.userData.isJumping = true
    player.userData.vy = JUMP_V
  }

  function spawnObstacle() {
    const o = createObstacle()
    o.castShadow = true
    o.position.z = SPAWN_Z
    o.position.x = LANES[Math.floor(Math.random() * LANES.length)]
    o.position.y = 0.45
    obstacles.push(o)
    scene.add(o)
  }


  function updatePlayer(dt) {
    // Suavizado lateral hacia el carril objetivo
    const targetX = player.userData.targetX
    player.position.x = THREE.MathUtils.damp(player.position.x, targetX, 12, dt)

    // Salto simple
    if (player.userData.isJumping) {
      player.userData.vy += GRAVITY * dt
      player.position.y += player.userData.vy * dt

      if (player.position.y <= player.userData.groundY) {
        player.position.y = player.userData.groundY
        player.userData.isJumping = false
        player.userData.vy = 0
      }
    }
  }

  function updateWorld(dt) {
    // Aumenta dificultad progresiva
    speed.value = Math.min(50, speed.value + dt * 0.25)

    // Spawn con timers (ajusta la frecuencia)
    obstacleTimer += dt

    if (obstacleTimer  >= 0.9) {
      obstacleTimer = 0
      spawnObstacle()
    }

    // Mover obstáculos/monedas hacia el jugador
    const dz = speed.value * dt

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i]
      o.position.z += dz
      if (o.position.z > DESPAWN_Z) {
        scene.remove(o)
        obstacles.splice(i, 1)
      }
    }

    // “Efecto movimiento” del suelo (opcional sencillo): moverlo y reciclar
    ground.position.z += dz
    if (ground.position.z > 0) ground.position.z = -20
  }

  function checkCollisions() {
    // Caja del jugador
    playerBox.setFromObject(player)

    // Obstáculos
    for (let i = 0; i < obstacles.length; i++) {
      tempBox.setFromObject(obstacles[i])
      if (playerBox.intersectsBox(tempBox)) {
        gameOver()
        return
      }
    }
  }

  function gameOver() {
    isGameOver.value = true
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('bestScore', String(best.value))
    }
  }

  function updateScore(dt) {
    // Score por tiempo (además de monedas)
    score.value += Math.floor(dt * 10)
  }

  function animate() {
    animationId = requestAnimationFrame(animate)

    const dt = clock.getDelta()

    if (!isGameOver.value) {
      updatePlayer(dt)
      updateWorld(dt)
      checkCollisions()
      updateScore(dt)
    }

    renderer.render(scene, camera)
  }

  function clearEntities() {
    for (const o of obstacles) scene.remove(o)
    obstacles.length = 0
  }

  function resetGame() {
    score.value = 0
    speed.value = 7
    isGameOver.value = false

    clearEntities()

    // Reset jugador
    player.position.set(0, 0.45, PLAYER_Z)
    player.userData.targetX = 0
    player.userData.isJumping = false
    player.userData.vy = 0

    // Reset suelo
    ground.position.z = -20

    obstacleTimer = 0
  }

  function start() {
    initThree()
    resetGame()
    animate()
  }

  function stop() {
    if (animationId) cancelAnimationFrame(animationId)
    animationId = null

    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)

    // Limpieza básica
    if (renderer) {
      renderer.dispose()
      renderer = null
    }
    scene = null
    camera = null
  }

  function restart() {
    resetGame()
  }

  return {
    start,
    stop,
    restart,
    score,
    best,
    speed,
    isGameOver
  }
}