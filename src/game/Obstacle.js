import * as THREE from 'three'

export function createObstacle() {
  const w = 0.9
  const h = 0.9
  const d = 0.9

  const geometry = new THREE.BoxGeometry(w, h, d)
  const material = new THREE.MeshStandardMaterial({ color: 0xff4d4d, metalness: 0.1, roughness: 0.5 })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.y = h / 2
  mesh.userData = { type: 'obstacle' }
  return mesh
}