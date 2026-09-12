import * as THREE from "three";
import { height } from "../landscape.js";
function box(group, w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
export function golfCart(parent) {
  const g = new THREE.Group();
  parent.add(g);
  box(g, 1.25, 0.24, 1.65, 0x416853, 0, 0.47, 0.15);
  box(g, 1.05, 0.14, 0.55, 0xd6cbb1, 0, 0.84, -0.13);
  box(g, 1.05, 0.4, 0.12, 0xd6cbb1, 0, 1.05, -0.45);
  box(g, 1.15, 0.38, 0.45, 0x416853, 0, 0.72, 0.78);
  for (const x of [-0.6, 0.6])
    for (const z of [-0.43, 0.72]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10),
        new THREE.MeshStandardMaterial({ color: 0x292a27 }),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.26, z);
      g.add(wheel);
    }
  for (const x of [-0.56, 0.56])
    for (const z of [-0.5, 0.78])
      box(g, 0.045, 1.45, 0.045, 0xbabbb1, x, 1.18, z);
  box(g, 1.4, 0.1, 1.75, 0xe0d6b5, 0, 1.94, 0.14);
  return g;
}
export function cartGarage(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, height(x, z), z);
  scene.add(g);
  box(g, 5.8, 0.12, 5.8, 0xa59879, 0, 0.06, 0);
  box(g, 5.2, 2.5, 0.18, 0xded1b0, 0, 1.3, -2);
  for (const px of [-2.55, 0, 2.55])
    box(g, 0.18, 2.5, 3.8, 0xc8ba97, px, 1.3, -0.15);
  box(g, 5.6, 0.2, 4.35, 0x56705a, 0, 2.65, -0.15);
  const roofGeometry = new THREE.CylinderGeometry(0, 3.6, 1.15, 4);
  roofGeometry.rotateY(Math.PI / 4);
  roofGeometry.scale(1.1, 1, 0.88);
  const roof = new THREE.Mesh(
    roofGeometry,
    new THREE.MeshStandardMaterial({ color: 0x805e43, roughness: 1 }),
  );
  roof.position.set(0, 3.27, -0.15);
  roof.castShadow = true;
  g.add(roof);
  for (let y = 0.35; y < 2.5; y += 0.25)
    box(g, 5.3, 0.035, 0.2, 0xc4b596, 0, y, -2);
  for (const px of [-2.55, 0, 2.55])
    box(g, 0.23, 2.55, 0.2, 0x58614a, px, 1.3, 1.8);
  box(g, 5.3, 0.2, 0.2, 0x58614a, 0, 2.5, 1.8);
  for (const px of [-1.28, 1.28]) {
    const cart = golfCart(g);
    cart.position.set(px, 0.12, 0.15);
  }
  return g;
}
