import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { height } from "../landscape.js";

export function regionalRecreation(scene, type, x, z) {
  const group = new THREE.Group(),
    batches = new Map();
  group.name = type;
  group.position.set(x, height(x, z), z);
  const add = (geo, color, x, y, z) => {
    geo.translate(x, y, z);
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo);
  };
  const box = (w, h, d, color, x, y, z) =>
    add(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  const roof = (w, d, x, y, z, color) => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, 1.3);
    shape.lineTo(w / 2, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -d / 2);
    add(geo, color, x, y, z);
  };
  box(13.6, 0.2, 13.6, type === "stable" ? 0x8a8c61 : 0xc9b385, 0, 0.1, 0);
  if (type === "stable") {
    // Stone and timber stable with three stalls opening onto a fenced paddock.
    box(12.5, 0.06, 8, 0x9c9871, 0, 0.23, 2.3);
    box(11.8, 2.5, 4.5, 0xb4b09a, 0, 1.45, -3.8);
    roof(12.5, 5.1, 0, 2.7, -3.8, 0x5f645e);
    for (const px of [-3.8, 0, 3.8]) {
      box(2.4, 1.95, 0.07, 0x403d31, px, 1.24, -1.51);
      box(2.2, 0.96, 0.1, 0x805b3c, px, 0.75, -1.4);
      box(0.12, 2.2, 0.13, 0xd3cbb0, px - 1.3, 1.35, -1.36);
      box(0.12, 2.2, 0.13, 0xd3cbb0, px + 1.3, 1.35, -1.36);
      box(2.8, 0.13, 0.13, 0xd3cbb0, px, 2.45, -1.36);
    }
    for (const side of [-1, 1]) {
      for (const pz of [-0.8, 1.6, 4, 6.4])
        box(0.15, 1.2, 0.15, 0xd1c3a0, side * 6.3, 0.85, pz);
      for (const y of [0.65, 1.25])
        box(0.09, 0.1, 7.2, 0xd1c3a0, side * 6.3, y, 2.8);
      for (const px of [2, 4.2, 6.3])
        box(0.15, 1.2, 0.15, 0xd1c3a0, side * px, 0.85, 6.4);
      for (const y of [0.65, 1.25])
        box(4.4, 0.1, 0.09, 0xd1c3a0, side * 4.2, y, 6.4);
    }
    // Two small stylized horses provide a readable stable silhouette.
    for (const [px, pz, color] of [
      [-2.5, 1.5, 0x775039],
      [2.5, 3.3, 0xa48358],
    ]) {
      box(0.65, 0.75, 1.55, color, px, 1.45, pz);
      for (const dx of [-0.22, 0.22])
        for (const dz of [-0.52, 0.52])
          box(0.14, 0.9, 0.14, 0x493c31, px + dx, 0.75, pz + dz);
      box(0.42, 0.9, 0.48, color, px, 1.95, pz - 0.65);
      box(0.4, 0.38, 0.7, color, px, 2.25, pz - 0.9);
      box(0.14, 0.24, 0.15, 0x493c31, px - 0.12, 2.55, pz - 0.7);
      box(0.14, 0.24, 0.15, 0x493c31, px + 0.12, 2.55, pz - 0.7);
      box(0.13, 0.75, 0.14, 0x493c31, px, 1.25, pz + 0.85);
    }
    for (const px of [-5, 5]) box(0.9, 0.7, 0.7, 0xc5ad65, px, 0.6, -0.3);
  } else {
    // Adobe spa with a shaded arcade and two round mineral baths.
    box(12.8, 0.06, 12.8, 0xe1ca99, 0, 0.24, 0);
    box(11.2, 2.8, 3.6, 0xcfa879, 0, 1.65, -4.4);
    box(11.7, 0.3, 4.1, 0xe3c594, 0, 3.18, -4.4);
    for (const px of [-4, 0, 4]) {
      box(1.7, 2, 0.05, 0x536c65, px, 1.35, -2.56);
      box(0.25, 2.55, 0.25, 0xe6cda0, px, 1.5, -1.9);
    }
    box(11.4, 0.2, 1.3, 0xa97850, 0, 2.87, -2.1);
    for (const px of [-2.8, 2.8]) {
      add(
        new THREE.CylinderGeometry(2.3, 2.3, 0.42, 24),
        0xeee0b5,
        px,
        0.49,
        2.1,
      );
      add(
        new THREE.CylinderGeometry(1.95, 1.95, 0.04, 24),
        0x64aeb0,
        px,
        0.72,
        2.1,
      );
      add(
        new THREE.TorusGeometry(1.45, 0.025, 4, 24).rotateX(Math.PI / 2),
        0xb4d8c5,
        px,
        0.75,
        2.1,
      );
    }
    for (const px of [-5.6, 5.6])
      for (const pz of [0, 5.4]) {
        box(0.75, 0.6, 0.75, 0x956c4d, px, 0.58, pz);
        add(
          new THREE.CylinderGeometry(0.15, 0.2, 1.1, 8),
          0x647c4f,
          px,
          1.1,
          pz,
        );
        add(new THREE.SphereGeometry(0.17, 8, 5), 0x647c4f, px, 1.65, pz);
      }
    for (const px of [-3.5, 3.5]) box(2.8, 0.35, 0.6, 0x9c7553, px, 0.6, 5.7);
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
  scene.add(group);
  return group;
}
