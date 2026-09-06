import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { height } from "../landscape.js";

// A compact parkland refreshment pavilion, contained by its three-tile plot.
export function snackBar(scene, x, z) {
  const group = new THREE.Group(),
    batches = new Map();
  group.position.set(x, height(x, z), z);
  scene.add(group);
  function add(geo, color, x, y, z) {
    geo.translate(x, y, z);
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo);
  }
  const box = (w, h, d, color, x, y, z) =>
    add(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  const cream = 0xe7dab8,
    timber = 0x68513a,
    green = 0x42604b;
  box(5.5, 0.16, 5.4, 0x9c927b, 0, 0.08, 0);
  box(4.4, 2.5, 3.5, cream, 0, 1.4, -0.55);
  // Clapboard courses, timber corners and low skirt.
  for (let y = 0.35; y < 2.65; y += 0.25) {
    box(4.45, 0.035, 3.55, 0xd1c3a0, 0, y, -0.55);
  }
  box(4.5, 0.3, 3.6, green, 0, 0.3, -0.55);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      box(0.13, 2.55, 0.13, timber, sx * 2.2, 1.4, -0.55 + sz * 1.75);
  // Broad dark serving hatch with cream mullions and a projecting counter.
  box(3.5, 1.1, 0.08, 0x293f37, 0, 1.55, 1.23);
  for (const px of [-1.75, 0, 1.75])
    box(0.1, 1.25, 0.13, cream, px, 1.55, 1.29);
  box(3.75, 0.16, 0.65, timber, 0, 1, 1.55);
  box(3.7, 0.07, 0.7, cream, 0, 1.11, 1.55);
  // Side door and window keep quarter-turn views readable.
  box(0.08, 1.8, 0.8, green, 2.24, 1.05, -0.8);
  box(0.08, 0.9, 1.15, 0x38544b, -2.24, 1.55, -0.8);
  box(0.12, 0.06, 1.2, cream, -2.28, 1.55, -0.8);
  box(0.12, 0.95, 0.06, cream, -2.28, 1.55, -0.8);
  // Hip roof, then rows of contrasting shingle strips on its visible slopes.
  const roof = new THREE.CylinderGeometry(0, 3.5, 1.15, 4);
  roof.rotateY(Math.PI / 4);
  roof.scale(1, 1, 0.85);
  add(roof, 0x815c3e, 0, 3.2, -0.55);
  for (let row = 0; row < 5; row++) {
    const f = (row + 0.5) / 5,
      y = 2.64 + f * 1.15,
      span = 4.95 * (1 - f);
    for (const side of [-1, 1])
      box(
        span,
        0.025,
        0.055,
        row % 2 ? 0x705136 : 0x97704b,
        0,
        y,
        -0.55 + side * 2.1 * (1 - f),
      );
  }
  // Green/cream canvas awning and hanging scallop strips.
  for (let i = 0; i < 10; i++) {
    const px = -2.025 + i * 0.45,
      color = i % 2 ? cream : green;
    const awning = new THREE.BoxGeometry(0.45, 0.09, 1.25);
    awning.rotateX(0.13);
    add(awning, color, px, 2.42, 1.9);
    box(0.45, 0.19, 0.07, color, px, 2.25, 2.5);
  }
  for (const px of [-2.1, 2.1]) {
    box(0.1, 2.35, 0.1, timber, px, 1.25, 2.45);
    box(0.21, 0.12, 0.21, cream, px, 0.24, 2.45);
  }
  // Menu board, drinks and two stools.
  box(0.55, 0.65, 0.06, timber, 1.12, 1.5, 1.37);
  box(0.44, 0.53, 0.07, 0x263d31, 1.12, 1.5, 1.41);
  for (let i = 0; i < 4; i++)
    box(0.3, 0.025, 0.015, cream, 1.12, 1.68 - i * 0.11, 1.455);
  for (const px of [-1.2, -0.85])
    add(new THREE.CylinderGeometry(0.09, 0.07, 0.22, 8), cream, px, 1.27, 1.55);
  for (const px of [-1.25, 1.25]) {
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12), green, px, 0.69, 2.18);
    box(0.1, 0.48, 0.1, timber, px, 0.4, 2.18);
  }
  for (const [color, geometries] of batches) {
    const mesh = new THREE.Mesh(
      mergeGeometries(geometries),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    geometries.forEach((g) => g.dispose());
  }
  return group;
}
