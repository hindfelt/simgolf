import * as THREE from "three";
import { height } from "../landscape.js";
export function trainingFacility(scene, type, x, z) {
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
  if (type === "pro-shop") {
    box(4.2, 2.8, 3.8, 0xe1d8bb, 0, 1.4, 0);
    const roof = mesh(
      new THREE.CylinderGeometry(0, 3.65, 1.4, 4),
      0x77513b,
      0,
      3.4,
      0,
    );
    roof.rotation.y = Math.PI / 4;
    box(0.9, 1.9, 0.12, 0x354b44, 0, 0.95, 1.94);
    for (const side of [-1, 1]) {
      box(1.05, 1.1, 0.12, 0x557e85, side * 1.35, 1.55, 1.94);
      box(1.2, 0.13, 0.2, 0xf5ecd4, side * 1.35, 1, 2);
    }
    box(4.6, 0.17, 1.05, 0xc3bfa4, 0, 0.09, 2.15);
    for (const side of [-1, 1]) pole(side * 1.95, 2.3, 2.7);
    box(4.6, 0.14, 1.2, 0x5b6a45, 0, 2.7, 2.2);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#eee3be";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#304a39";
    ctx.font = "bold 32px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("PRO SHOP", 128, 43);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshStandardMaterial({ map: texture }),
    );
    sign.position.set(0, 2.3, 2.02);
    group.add(sign);
  } else if (type === "driving-range") {
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
      box(2.7, 0.16, 2.1, 0x765239, x, 2.5, 3.2);
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
