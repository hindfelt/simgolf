import * as THREE from "three";
import { height } from "../landscape.js";
export function church(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, height(x, z), z);
  const box = (w, h, d, color, x, y, z) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  box(9.5, 0.16, 9.5, 0x71805a, 0, 0.08, 0);
  box(4.6, 3.4, 6, 0xb1ad95, 0, 1.8, -0.6);
  for (const side of [-1, 1]) {
    const roof = box(2.9, 0.18, 6.5, 0x596563, side * 1.15, 4.05, -0.6);
    roof.rotation.z = -side * 0.55;
    for (const z of [-2.5, -0.5, 1.4]) {
      box(0.1, 1.4, 0.65, 0x506667, side * 2.35, 2, z);
      box(0.12, 1.5, 0.08, 0xd4cbb1, side * 2.42, 2, z);
    }
  }
  for (const z of [-3.6, 2.4]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-2.3, 3.4, z, 2.3, 3.4, z, 0, 4.76, z],
        3,
      ),
    );
    geometry.computeVertexNormals();
    const gable = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0xb1ad95,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    gable.castShadow = true;
    g.add(gable);
  }
  box(2.5, 5.7, 2.7, 0xa6a58f, 0, 2.95, 2.7);
  box(1.05, 2, 0.12, 0x5b5743, 0, 1.15, 4.1);
  box(0.8, 1, 0.13, 0x455754, 0, 4.7, 4.1);
  for (const x of [-1.05, 1.05])
    for (const z of [1.55, 3.85]) box(0.5, 0.7, 0.5, 0xc2bca3, x, 6, z);
  box(2.7, 0.25, 2.9, 0xc2bca3, 0, 5.7, 2.7);
  box(0.15, 1.2, 0.15, 0xd7d0ad, 0, 6.1, 2.7);
  box(0.7, 0.14, 0.14, 0xd7d0ad, 0, 6.3, 2.7);
  box(1.6, 0.1, 0.55, 0xc8bfa2, 0, 0.17, 4.4);
  scene.add(g);
  return g;
}
