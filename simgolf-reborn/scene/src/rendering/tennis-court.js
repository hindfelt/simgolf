import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import { height } from "../landscape.js";
export function tennisCourt(scene, x, z) {
  const group = new THREE.Group();
  group.position.set(x, height(x, z), z);
  scene.add(group);
  const batches = new Map();
  const box = (w, h, d, color, x, y, z) => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(x, y, z);
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geometry);
  };
  box(13.6, 0.18, 13.6, 0x9b9b83, 0, 0.1, 0);
  box(13, 0.03, 13, 0xa94d3f, 0, 0.21, 0);
  // Two courts share an enclosed red surround, matching the original parkland resort.
  for (const cx of [-3.2, 3.2]) {
    box(4.9, 0.025, 10.3, 0x427968, cx, 0.24, 0);
    for (const px of [-2.2, 2.2])
      box(0.055, 0.018, 9.6, 0xf0eacb, cx + px, 0.26, 0);
    for (const pz of [-4.8, 4.8, -2.3, 2.3])
      box(4.4, 0.018, 0.055, 0xf0eacb, cx, 0.26, pz);
    box(0.055, 0.018, 4.6, 0xf0eacb, cx, 0.26, 0);
    for (const px of [-2.5, 2.5])
      box(0.09, 1.05, 0.09, 0xe7dfc6, cx + px, 0.76, 0);
    box(5, 0.05, 0.05, 0xe9e2cb, cx, 1.2, 0);
    for (let i = 0; i < 26; i++)
      box(0.014, 0.85, 0.014, 0x566357, cx - 2.5 + i * 0.2, 0.76, 0);
    for (let i = 0; i < 5; i++)
      box(5, 0.014, 0.014, 0x566357, cx, 0.35 + i * 0.17, 0);
  }
  // Fence has a central entrance gap on each side, aligned with the four path entrances.
  for (const side of [-1, 1])
    for (const k of [-6.5, -3.25, 3.25, 6.5]) {
      box(0.14, 2, 0.14, 0xe5dac4, k, 1.23, side * 6.5);
      box(0.14, 2, 0.14, 0xe5dac4, side * 6.5, 1.23, k);
    }
  for (const side of [-1, 1])
    for (const part of [-1, 1]) {
      box(5.8, 0.055, 0.055, 0xd4c9ad, part * 3.6, 2.23, side * 6.5);
      box(0.055, 0.055, 5.8, 0xd4c9ad, side * 6.5, 2.23, part * 3.6);
      for (let n = 0; n < 25; n++) {
        const p = part * (0.8 + n * 0.23);
        box(0.012, 1.8, 0.012, 0x526653, p, 1.25, side * 6.5);
        box(0.012, 1.8, 0.012, 0x526653, side * 6.5, 1.25, p);
      }
    }
  for (const [color, geometries] of batches) {
    const mesh = new THREE.Mesh(
      mergeGeometries(geometries),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13,8,6),new THREE.MeshStandardMaterial({color:0xe8ed63}));
  ball.visible=false;group.add(ball);group.userData.tennisBall=ball;
  return group;
}
