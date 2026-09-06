import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { height, makeTexture, riverZ, bridgeLayout } from "./landscape.js";

// Bake repeated architectural details into one mesh per material, preserving real geometry.
export class Mason {
  constructor(parent) {
    this.parent = parent;
    this.parts = new Map();
  }
  add(geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
    if (geometry.index) {
      const original = geometry;
      geometry = geometry.toNonIndexed();
      original.dispose();
    }
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(m);
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(geometry);
  }
  box(w, h, d, mat, x, y, z, ry = 0) {
    this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, 0, ry);
  }
  cylinder(rt, rb, h, mat, x, y, z, n = 8, rx = 0, rz = 0) {
    this.add(new THREE.CylinderGeometry(rt, rb, h, n), mat, x, y, z, rx, 0, rz);
  }
  finish() {
    for (const [material, parts] of this.parts) {
      const geometry = mergeGeometries(parts);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.parent.add(mesh);
      for (const part of parts) part.dispose();
    }
    this.parts.clear();
  }
}

export function buildClubhouse(scene) {
  const group = new THREE.Group();
  group.position.set(-29, height(-29, -24), -24);
  scene.add(group);
  group.name = "clubhouse";
  const b = new Mason(group);
  const wall = new THREE.MeshStandardMaterial({
    map: makeTexture("wall"),
    color: 0xe9e5ce,
    roughness: 0.9,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0xe9e4cd,
    roughness: 0.75,
  });
  const darkWood = new THREE.MeshStandardMaterial({
    color: 0x69604e,
    roughness: 0.9,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x2c4248,
    roughness: 0.24,
    metalness: 0.27,
  });
  const roofTex = makeTexture("roof");
  const roof = new THREE.MeshStandardMaterial({
    map: roofTex,
    color: 0xbca086,
    roughness: 0.94,
  });
  const stoneTex = makeTexture("stone");
  stoneTex.repeat.set(2, 1);
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 1 });
  const brass = new THREE.MeshStandardMaterial({
    color: 0x9e8751,
    roughness: 0.46,
    metalness: 0.5,
  });
  const brick = new THREE.MeshStandardMaterial({
    color: 0x7e5846,
    roughness: 1,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x393c33,
    roughness: 0.7,
  });
  function hipRoof(x, y, z, w, d, h) {
    const ridge = Math.max(0, w / 2 - d * 0.36);
    const verts = [
      [-w / 2, 0, -d / 2],
      [w / 2, 0, -d / 2],
      [w / 2, 0, d / 2],
      [-w / 2, 0, d / 2],
      [-ridge, h, 0],
      [ridge, h, 0],
    ];
    const faces = [
      [0, 4, 5],
      [0, 5, 1],
      [1, 5, 2],
      [2, 5, 4],
      [2, 4, 3],
      [3, 4, 0],
    ];
    const ps = [],
      uv = [];
    for (const f of faces)
      for (const i of f) {
        const v = verts[i];
        ps.push(...v);
        uv.push((v[0] + w / 2) * 0.27, (v[2] + d / 2) * 0.26 + v[1] * 0.12);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(ps, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    b.add(g, roof, x, y, z);
    b.box(w + 0.2, 0.18, d + 0.2, darkWood, x, y - 0.07, z);
    b.box(w - 0.1, 0.16, d + 0.12, trim, x, y - 0.22, z);
    b.box(ridge * 2 + 0.15, 0.16, 0.2, roof, x, y + h + 0.03, z);
  }
  function window(x, y, z, w = 1.05, h = 1.65, side = 0) {
    if (side) {
      b.box(0.1, h + 0.18, w + 0.22, trim, x, y, z);
      b.box(0.14, h, w, glass, x + 0.03 * side, y, z);
      b.box(0.16, h, 0.065, trim, x + 0.09 * side, y, z);
      b.box(0.16, 0.065, w, trim, x + 0.09 * side, y + 0.12, z);
      b.box(0.28, 0.14, w + 0.4, trim, x, y - h / 2 - 0.12, z);
    } else {
      b.box(w + 0.22, h + 0.18, 0.12, trim, x, y, z);
      b.box(w, h, 0.14, glass, x, y, z + 0.06);
      b.box(0.065, h, 0.16, trim, x, y, z + 0.14);
      b.box(w, 0.065, 0.16, trim, x, y + 0.12, z + 0.14);
      b.box(w + 0.4, 0.14, 0.34, trim, x, y - h / 2 - 0.12, z + 0.08);
      b.box(w + 0.3, 0.11, 0.23, trim, x, y + h / 2 + 0.15, z + 0.04);
    }
  }
  function block(x, z, w, d, h) {
    b.box(w + 0.24, 1.05, d + 0.24, stone, x, 0.52, z);
    b.box(w, h - 1, d, wall, x, (h + 1) / 2, z);
    for (const y of [1.12, 3.7, 6.4, h - 0.08])
      b.box(w + 0.2, 0.15, d + 0.2, trim, x, y, z);
    for (const xx of [x - w / 2 + 0.15, x + w / 2 - 0.15]) {
      b.box(0.28, h, 0.27, trim, xx, h / 2, z + d / 2 + 0.05);
      b.box(0.28, h, 0.27, trim, xx, h / 2, z - d / 2 - 0.05);
    }
    for (let xx = x - w / 2 + 1; xx < x + w / 2 - 0.4; xx += 2.1)
      for (const y of [2.35, 5.05]) window(xx, y, z + d / 2 + 0.025);
    for (let zz = z - d / 2 + 1; zz < z + d / 2; zz += 2.15)
      for (const y of [2.35, 5.05]) {
        window(x - w / 2 - 0.04, y, zz, 1, 1.6, -1);
        window(x + w / 2 + 0.04, y, zz, 1, 1.6, 1);
      }
    hipRoof(x, h + 0.1, z, w + 1, d + 1, 2.9);
  }
  block(0, 0, 22, 10, 7.3);
  block(-10, 1, 7, 14, 7.5);
  block(10, 1, 7, 14, 7.5);
  // Rear tower and front bay give the roofline the asymmetry of an old country hotel.
  block(-5, -3.2, 5, 6, 10.2);
  hipRoof(-5, 10.35, -3.2, 5.8, 6.8, 2.65);
  for (let i = 0; i < 3; i++) window(-6.55 + i * 1.5, 8.6, -0.18, 0.82, 1.4);
  // Roof dormers, with real cheeks, gables, glazing and deep eaves.
  for (const x of [-11, -7, 0, 6.8, 10.5]) {
    const z = x === 0 ? 2.2 : 3.5,
      y = x === 0 ? 9.0 : 8.4;
    b.box(2.1, 1.7, 1.8, wall, x, y, z);
    window(x, y, z + 0.93, 1.15, 1.35);
    hipRoof(x, y + 0.92, z, 2.7, 2.7, 1.0);
  }
  // Central octagonal entrance tower, with eight individually framed faces.
  b.cylinder(2.2, 2.2, 8.7, wall, 0, 4.9, 5, 8);
  b.cylinder(2.36, 2.36, 0.18, trim, 0, 6.5, 5, 8);
  b.cylinder(2.38, 2.38, 0.22, trim, 0, 9.2, 5, 8);
  b.cylinder(0.48, 2.85, 3.1, roof, 0, 10.82, 5, 8);
  b.cylinder(0.5, 0.5, 0.17, trim, 0, 12.38, 5, 8);
  b.cylinder(0.34, 0.34, 1.0, wall, 0, 12.96, 5, 8);
  b.cylinder(0, 0.65, 1.1, roof, 0, 13.95, 5, 8);
  b.cylinder(0.04, 0.04, 1, brass, 0, 14.8, 5, 6);
  b.box(1.2, 0.08, 0.06, brass, 0, 15.04, 5);
  for (const yy of [5.0, 7.7]) {
    window(0, yy, 7.06, 1.2, 1.7);
    window(-1.6, yy, 6.46, 0.78, 1.7);
    window(1.6, yy, 6.46, 0.78, 1.7);
  }
  // Veranda, posts, turned capitals and railings.
  b.box(26, 0.32, 4.2, stone, 0, 1, 8.9);
  hipRoof(0, 4.1, 8.3, 26.6, 4.3, 0.55);
  for (let x = -12.5; x <= 12.6; x += 2.08) {
    b.box(0.23, 3.05, 0.23, trim, x, 2.63, 10.35);
    b.box(0.4, 0.25, 0.4, trim, x, 1.33, 10.35);
    b.box(0.41, 0.17, 0.41, trim, x, 4, 10.35);
    b.box(0.11, 0.85, 0.11, trim, x + 0.4, 1.7, 10.35);
    b.box(0.11, 0.85, 0.11, trim, x + 0.8, 1.7, 10.35);
    b.box(0.11, 0.85, 0.11, trim, x + 1.2, 1.7, 10.35);
  }
  for (const x of [-7.3, 7.3]) {
    b.box(10.4, 0.14, 0.24, trim, x, 2.17, 10.35);
    b.box(10.4, 0.12, 0.24, trim, x, 1.28, 10.35);
  }
  // Entrance and descending broad steps.
  b.box(2.2, 2.75, 0.16, darkWood, 0, 2.38, 7.28);
  b.box(0.08, 2.75, 0.17, trim, 0, 2.38, 7.41);
  b.box(1.6, 0.8, 0.19, glass, 0, 3.05, 7.4);
  b.cylinder(0.035, 0.035, 0.19, brass, 0.23, 2.1, 7.56, 6, Math.PI / 2);
  for (let i = 0; i < 6; i++)
    b.box(
      4.7,
      0.18 * (6 - i),
      0.68,
      stone,
      0,
      0.09 * (6 - i),
      11.25 + i * 0.63,
    );
  for (const x of [-2.6, 2.6]) {
    b.box(0.33, 1.25, 4.2, stone, x, 0.62, 12.5);
    b.box(0.46, 0.13, 4.35, trim, x, 1.31, 12.5);
  }
  for (const [x, z, y] of [
    [-11, -2, 10.7],
    [7, -1, 10.7],
    [-3, -4, 12],
  ]) {
    b.box(0.9, 2.5, 1.1, brick, x, y, z);
    b.box(1.14, 0.22, 1.34, stone, x, y + 1.25, z);
    b.box(0.6, 0.12, 0.7, black, x, y + 1.39, z);
  }
  // Timber brackets and fascia boards articulate the light facade at course scale.
  for (let x = -12; x < 13; x += 1.3)
    b.box(0.12, 0.48, 0.38, darkWood, x, 7.1, 5.25);
  b.finish();
  return group;
}

export function buildBridge(scene) {
  const group = new THREE.Group();
  group.position.set(bridgeLayout.x, 0, bridgeLayout.z);
  scene.add(group);
  group.name = "bridge";
  const b = new Mason(group);
  const texture = makeTexture("stone");
  texture.repeat.set(2, 2);
  const stone = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xc0bca7,
    roughness: 1,
  });
  const cap = new THREE.MeshStandardMaterial({ color: 0xb2ab91, roughness: 1 });
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const z = -bridgeLayout.halfSpan + t * bridgeLayout.halfSpan * 2;
    const northHeight = height(
      bridgeLayout.x,
      bridgeLayout.z - bridgeLayout.halfSpan,
    );
    const southHeight = height(
      bridgeLayout.x,
      bridgeLayout.z + bridgeLayout.halfSpan,
    );
    // The deck surface meets terrain at both ends, rather than leaving a step or gap.
    const y =
      THREE.MathUtils.lerp(northHeight, southHeight, t) -
      0.185 +
      1.3 * Math.sin(t * Math.PI);
    b.box(3, 0.37, 0.42, stone, 0, y, z);
    for (const x of [-1.55, 1.55]) {
      b.box(0.48, 0.72, 0.4, stone, x, y + 0.48, z);
      b.box(0.62, 0.12, 0.44, cap, x, y + 0.9, z);
    }
  }
  for (const x of [-1.55, 1.55])
    for (const z of [-4.8, 4.8]) b.box(0.68, 1.5, 0.88, stone, x, 0.24, z);
  b.finish();
  return group;
}

export function bench(scene, x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, height(x, z), z);
  group.rotation.y = rotation;
  scene.add(group);
  const b = new Mason(group);
  const wood = new THREE.MeshStandardMaterial({
    color: 0x92704a,
    roughness: 0.9,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: 0x3a4134,
    roughness: 0.7,
    metalness: 0.25,
  });
  for (let i = 0; i < 4; i++) {
    b.box(2, 0.1, 0.15, wood, 0, 0.64, -0.3 + i * 0.17);
    b.box(2, 0.14, 0.1, wood, 0, 0.87 + i * 0.19, -0.37);
  }
  for (const x of [-0.75, 0.75]) {
    b.box(0.1, 0.8, 0.11, iron, x, 0.4, 0);
    b.box(0.1, 0.09, 0.82, iron, x, 0.12, 0);
    b.box(0.09, 1.05, 0.1, iron, x, 0.87, -0.37);
    b.box(0.09, 0.1, 0.72, iron, x, 1.0, -0.01);
  }
  b.finish();
  return group;
}
