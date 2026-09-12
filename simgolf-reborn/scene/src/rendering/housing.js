import * as THREE from "three";
import { height } from "../landscape.js";
export function housing(scene, type, x, z) {
  const group = new THREE.Group();
  group.position.set(x, height(x, z), z);
  const box = (w, h, d, color, x, y, z) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  box(5.6, 0.12, 5.6, 0x69804a, 0, 0.06, 0);
  for (const x of [-2.6, 2.6])
    for (const z of [-2.6, 2.6]) box(0.12, 0.8, 0.12, 0xe4d9b4, x, 0.4, z);
  if (type === "building-lot") {
    box(0.13, 1.8, 0.13, 0x765d3f, 0, 0.9, -0.5);
    box(2, 0.85, 0.12, 0xf0e1b6, 0, 1.4, -0.5);
    for (const x of [-0.55, 0, 0.55])
      box(0.2, 0.35, 0.03, 0x497348, x, 1.4, -0.42);
  } else {
    box(3.8, 2.4, 3.4, 0xe0d1aa, 0, 1.3, 0);
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 3.1, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x80604b, roughness: 1 }),
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.1;
    roof.scale.z = 0.9;
    roof.castShadow = true;
    group.add(roof);
    box(0.75, 1.5, 0.1, 0x586b59, 0, 0.85, 1.75);
    for (const x of [-1.25, 1.25]) box(0.7, 0.85, 0.1, 0x688c91, x, 1.5, 1.75);
    box(1.1, 0.1, 1, 0xb6ac8c, 0, 0.16, 2.25);
    box(0.45, 1.2, 0.5, 0x9f8266, 1.1, 3.35, -0.4);
  }
  scene.add(group);
  return group;
}
