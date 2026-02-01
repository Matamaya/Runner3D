import * as THREE from 'three'

export function createHeart() {
  // Simple representación de un "corazón" o vida extra (Cubo rosa por ahora)
  const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4)
  const material = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0x220022 })
  const mesh = new THREE.Mesh(geometry, material)
  
  mesh.position.y = 0.5
  mesh.userData = { type: 'heart' }
  return mesh
}