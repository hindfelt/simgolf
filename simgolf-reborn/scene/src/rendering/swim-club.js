import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { height } from "../landscape.js";
export function swimClub(scene, x, z) {
  const group = new THREE.Group();
  group.name = "swim-club";
  group.position.set(x, height(x, z), z);
  const batches = new Map();
  function add(geometry, color, x, y, z) {
    geometry.translate(x, y, z);
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geometry);
  }
  const box = (w, h, d, color, x, y, z) =>
    add(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  box(13.6, 0.2, 13.6, 0xb89e77, 0, 0.1, 0);
  box(13.2, 0.04, 13.2, 0xe1cf9b, 0, 0.23, 0);
  // Raised cream coping surrounds a turquoise pool; the whole club is a building footprint.
  box(8.3, 0.18, 8.5, 0xf0e3b8, -1.4, 0.34, 0.6);
  box(7.7, 0.025, 7.9, 0x499fa6, -1.4, 0.44, 0.6);
  box(7.3, 0.012, 7.5, 0x66bcc0, -1.4, 0.46, 0.6);
  for (let n = 0; n < 7; n++)
    box(5.8, 0.008, 0.035, 0x9dd5c8, -1.4, 0.47, -2.5 + n);
  // Small changing pavilion at the rear, terracotta roof and a shaded veranda.
  box(8.2, 1.9, 2.4, 0xe9d9ad, 0, 1.2, -5);
  box(8.8, 0.18, 3.2, 0xa56444, 0, 2.22, -4.8);
  for (const x of [-3.4, 0, 3.4]) box(0.12, 1.8, 0.12, 0x736448, x, 1.2, -3.5);
  for (const x of [-2.7, 0, 2.7]) {
    box(0.8, 1.4, 0.035, 0x526e62, x, 1.05, -3.78);
    box(0.055, 0.055, 0.055, 0xdab864, x + 0.2, 1.08, -3.75);
  }
  for (const z of [-1.5, 2.6]) {
    box(1, 0.22, 2.1, 0xb48356, 4.8, 0.55, z);
    box(0.85, 0.12, 1.9, 0xe6d8ae, 4.8, 0.73, z);
    const back = new THREE.BoxGeometry(0.85, 0.1, 0.65);
    back.rotateX(-0.55);
    add(back, 0xe6d8ae, 4.8, 0.95, z - 0.7);
    add(
      new THREE.CylinderGeometry(0.055, 0.055, 2.4, 8),
      0x766044,
      3.7,
      1.5,
      z,
    );
    add(new THREE.ConeGeometry(1.35, 0.6, 8), 0xc47c55, 3.7, 2.75, z);
  }
  for (const x of [-5.8, 5.8])
    for (const z of [-5.8, 5.8]) {
      box(0.8, 0.6, 0.8, 0xad774e, x, 0.55, z);
      add(new THREE.IcosahedronGeometry(0.62, 1), 0x607849, x, 1.1, z);
    }
  // Low boundary rails with open path entrances at the midpoint of each side.
  for (const side of [-1, 1])
    for (const half of [-1, 1]) {
      box(5.6, 0.07, 0.07, 0x8f7756, half * 3.7, 0.95, side * 6.55);
      box(0.07, 0.07, 5.6, 0x8f7756, side * 6.55, 0.95, half * 3.7);
      for (const v of [1, 3.5, 6.4]) {
        box(0.12, 0.9, 0.12, 0x8f7756, half * v, 0.65, side * 6.55);
        box(0.12, 0.9, 0.12, 0x8f7756, side * 6.55, 0.65, half * v);
      }
    }
  for (const [color, geometries] of batches) {
    const mesh = new THREE.Mesh(
      mergeGeometries(geometries),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
  scene.add(group);
  return group;
}
