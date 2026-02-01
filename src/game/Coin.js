import * as THREE from 'three'

export function createCoin() {
  // Usamos un Cilindro rotado para parecer una moneda
  const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16)
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xffd700, // Dorado
    metalness: 0.8, 
    roughness: 0.2 
  })
  const mesh = new THREE.Mesh(geometry, material)
  
  mesh.rotation.x = Math.PI / 2 // Girar para que esté de pie
  mesh.position.y = 0.5
  
  // Datos para la lógica
  mesh.userData = { type: 'coin', value: 100 }
  return mesh
}