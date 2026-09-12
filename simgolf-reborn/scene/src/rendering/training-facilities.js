import * as THREE from "three";
import {proShop} from "./pro-shop.js";
import { height } from "../landscape.js";
export function trainingFacility(scene, type, x, z, environment=null) {
  if(type==="pro-shop")return proShop(scene,x,z,environment);
  const group = new THREE.Group();
  group.position.set(x, height(x, z), z);
  scene.add(group);
  const mesh = (geo, color, px, py, pz) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    );
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const box = (w, h, d, color, x, y, z) =>
    mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  const pole = (x, z, h = 2) =>
    mesh(new THREE.CylinderGeometry(0.055, 0.055, h, 6), 0xe9e4c8, x, h / 2, z);
  if (type === "driving-range") {
    box(8.7, 0.12, 8.7, 0x527235, 0, 0.07, 0);
    for (let i = 0; i < 5; i++)
      box(
        1.7,
        0.025,
        6.3,
        i % 2 ? 0x8aa64e : 0x779344,
        (i - 2) * 1.7,
        0.15,
        -0.8,
      );
    for (const x of [-4.1, 0, 4.1]) pole(x, -4, 4);
    // Thin net strands keep the practice enclosure readable at isometric scale.
    for (let i = 0; i <= 16; i++)
      box(0.018, 3.8, 0.018, 0x53675a, -4 + i * 0.5, 2, -4);
    for (let i = 1; i <= 8; i++)
      box(8.2, 0.018, 0.018, 0x53675a, 0, i * 0.5, -4);
    for (const x of [-2.8, 0, 2.8]) {
      box(2.1, 0.05, 1.25, 0x2c664a, x, 0.2, 2.6);
      pole(x - 1.1, 3.9, 2.4);
      box(2.7, 0.16, 2.1, environment==='tropical'?0xcfb575:environment==='links'?0x5c6a69:0x765239, x, 2.5, 3.2);
      mesh(new THREE.SphereGeometry(0.1, 6, 4), 0xf5f0d9, x, 0.3, 2.4);
    }
  } else {
    function lawn(w, d, r, color, y) {
      const s = new THREE.Shape();
      s.moveTo(-w / 2 + r, -d / 2);
      s.lineTo(w / 2 - r, -d / 2);
      s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
      s.lineTo(w / 2, d / 2 - r);
      s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
      s.lineTo(-w / 2 + r, d / 2);
      s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
      s.lineTo(-w / 2, -d / 2 + r);
      s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
      const m = mesh(new THREE.ShapeGeometry(s), color, 0, y, 0);
      m.rotation.x = -Math.PI / 2;
    }
    lawn(9, 9, 1.5, 0x3f602f, 0.15);
    lawn(8.1, 8.1, 1.2, 0x9db45b, 0.17);
    for (const [x, z] of [
      [-2, -2],
      [2, 0],
      [-1, 2],
    ]) {
      const hole = mesh(
        new THREE.CircleGeometry(0.15, 12),
        0x253722,
        x,
        0.19,
        z,
      );
      hole.rotation.x = -Math.PI / 2;
      pole(x, z, 1.3);
      box(0.55, 0.3, 0.035, 0xddc854, x + 0.27, 1.15, z);
    }
  }
  return group;
}
