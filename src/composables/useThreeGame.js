import * as THREE from 'three'
import { ref } from 'vue'
import { createPlayer } from '../game/Player'
import { createObstacle } from '../game/Obstacle'
import { createCoin } from '../game/Coin'   
import { createHeart } from '../game/PowerUp' 

export function useThreeGame(canvasRef) {
  // Estado para Vue (HUD)
  const score = ref(0)
  const best = ref(Number(localStorage.getItem('bestScore') ?? 0))
  const speed = ref(7) // unidades/segundo
  const isGameOver = ref(false)
  const lives = ref(3) // Sistema de vidas

  // Three.js
  let scene, camera, renderer
  let animationId = null
  let clock = null

  const worldObjects = [] // Array genérico para obstáculos y monedas

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
  const SPAWN_Z = -40 // Generar más lejos
  const DESPAWN_Z = 10
  const PLAYER_Z = 0

  // Variables de lógica
  let distanceSinceLastSpawn = 0 // Control de spawn por distancia
  let invulnerableTime = 0       // Para parpadeo tras golpe

  // Física simple salto
  const GRAVITY = -20
  const JUMP_V = 9.5

  // Colisiones
  const playerBox = new THREE.Box3()
  const tempBox = new THREE.Box3()

  // Audio (Placeholder simple)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

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
    if (e.code === 'Space') {
      jump()
      playSound('jump')
    }
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

  // --- NUEVA LÓGICA DE SPAWN ---
  function spawnRandomEntity() {
    const lane = LANES[Math.floor(Math.random() * LANES.length)]
    const r = Math.random()
    
    let obj = null
    
    if (r > 0.8) {
        // 20% probabilidad de Moneda
        obj = createCoin()
    } else if (r > 0.95) {
        // 5% probabilidad de Vida (muy raro)
        obj = createHeart()
    } else {
        // El resto obstáculo
        obj = createObstacle()
    }
    
    obj.position.set(lane, obj.position.y, SPAWN_Z)
    worldObjects.push(obj)
    scene.add(obj)
  }


  // nueva funcion para sonido
  function playSound(type) {
    // Aquí iría la carga real de sonidos. Esto es un sintetizador básico para no requerir archivos mp3
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'jump') {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    } else if (type === 'coin') {
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    }
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  }


 function updatePlayer(dt) {
      // (Lógica de movimiento lateral y salto igual que antes...)
      const targetX = player.userData.targetX
      player.position.x = THREE.MathUtils.damp(player.position.x, targetX, 10, dt)

      if (player.userData.isJumping) {
          player.userData.vy += -30 * dt // Gravity
          player.position.y += player.userData.vy * dt
          if (player.position.y <= 0.45) {
              player.position.y = 0.45
              player.userData.isJumping = false
              player.userData.vy = 0
          }
      }

      // Parpadeo de invulnerabilidad
      if (invulnerableTime > 0) {
          invulnerableTime -= dt
          if (invulnerableTime <= 0) {
              player.material.emissive.setHex(0x000000) // Restaurar color
          } else {
              // Parpadeo rápido
              const blink = Math.sin(Date.now() / 50) > 0
              player.visible = blink
          }
      } else {
          player.visible = true
      }
  }

  function updateWorld(dt) {
    // Aumentar velocidad progresivamente
    speed.value += dt * 0.1

    // Punto 1: Generación basada en DISTANCIA, no en tiempo.
    // Cuanto más rápido vas, más distancia recorres, manteniendo el ritmo visual constante.
    distanceSinceLastSpawn += speed.value * dt
    
    // Generar un objeto cada 15 metros virtuales
    if (distanceSinceLastSpawn > 15) {
        distanceSinceLastSpawn = 0
        spawnRandomEntity()
    }

    // Mover objetos
    const dz = speed.value * dt
    for (let i = worldObjects.length - 1; i >= 0; i--) {
      const o = worldObjects[i]
      o.position.z += dz
      
      // Rotación de monedas
      if (o.userData.type === 'coin' || o.userData.type === 'heart') {
          o.rotation.y += dt * 3
      }

      if (o.position.z > DESPAWN_Z) {
        scene.remove(o)
        worldObjects.splice(i, 1)
      }
    }
    
    // Loop suelo
    ground.position.z += dz
    if (ground.position.z > 0) ground.position.z = -20
  }

  function checkCollisions() {
    if (invulnerableTime > 0) return // Si es invulnerable, ignorar colisiones malas

    const playerBox = new THREE.Box3().setFromObject(player)
    const tempBox = new THREE.Box3()

    for (let i = worldObjects.length - 1; i >= 0; i--) {
      const obj = worldObjects[i]
      tempBox.setFromObject(obj)

      if (playerBox.intersectsBox(tempBox)) {
        handleCollision(obj, i)
      }
    }
  }

  function handleCollision(obj, index) {
      const type = obj.userData.type

      if (type === 'obstacle') {
          // Punto 4: Sistema de vidas
          lives.value--
          playSound('hit')
          
          // Eliminar el obstáculo chocado para no chocar 2 veces
          scene.remove(obj)
          worldObjects.splice(index, 1)
          
          if (lives.value <= 0) {
              gameOver()
          } else {
              // Invulnerabilidad temporal
              invulnerableTime = 1.5 
              // Efecto visual (cambiar color temporalmente)
              player.material.emissive.setHex(0xff0000)
          }
      } 
      else if (type === 'coin') {
          // Punto 2: Monedas
          score.value += 50
          playSound('coin')
          scene.remove(obj)
          worldObjects.splice(index, 1)
      }
      else if (type === 'heart') {
          lives.value = Math.min(lives.value + 1, 3) // Max 3 vidas
          playSound('coin') // Reusamos sonido
          scene.remove(obj)
          worldObjects.splice(index, 1)
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
      // Score por distancia también
      score.value += Math.floor(speed.value * dt) 
    }
    renderer.render(scene, camera)
  }

  function clearEntities() {
    for (const o of obstacles) scene.remove(o)
    obstacles.length = 0
  }

  function resetGame() {
      // Limpiar objetos
      worldObjects.forEach(o => scene.remove(o))
      worldObjects.length = 0
      
      score.value = 0
      speed.value = 10
      lives.value = 3
      isGameOver.value = false
      invulnerableTime = 0
      
      player.position.set(0, 0.45, 0)
      player.material.emissive.setHex(0x000000)
      player.visible = true
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
    start: () => { initThree(); animate() },
    stop: () => { /* limpieza */ cancelAnimationFrame(animationId) },
    restart: resetGame,
    score, 
    best, 
    speed, 
    isGameOver, 
    lives 
  }
}