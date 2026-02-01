import * as THREE from 'three'

export function createPlayer() {
  const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9)
  const material = new THREE.MeshStandardMaterial({ color: 0x00ffcc, metalness: 0.2, roughness: 0.4 })
  const mesh = new THREE.Mesh(geometry, material)

  // Colocamos al jugador "sobre el suelo"
  mesh.position.set(0, 0.45, 0)

  // Propiedades de juego
  mesh.userData = {
    laneX: 0,
    targetX: 0,
    isJumping: false,
    vy: 0,
    groundY: 0.45
  }

  return mesh
}