import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { height } from "../landscape.js";
export function resortHotel(scene, x, z, environment=null) {
  const tropical=environment==='tropical';
  const group = new THREE.Group();
  group.position.set(x, height(x, z), z);
  scene.add(group);
  const batches = new Map();
  function geometry(geo, color, x, y, z) {
    if(tropical)color=({[0xe1d8b9]:0xb08b5b,[0xf0e5c9]:0xe0be87,[0xece0bf]:0xe0be87,[0x81563c]:0xc9ac70})[color]??color;
    geo.translate(x, y, z);
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo);
  }
  const box = (w, h, d, color, x, y, z) =>
    geometry(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  box(9.5, 0.18, 9.5, 0x9c9276, 0, 0.09, 0);
  box(8, tropical?4.4:6.4, 6.5, 0xe1d8b9, 0, tropical?2.3:3.3, 0);
  for (const y of (tropical?[0.6,2.6,4.6]:[0.6, 2.6, 4.6, 6.6])) box(8.3, 0.16, 6.8, 0xf0e5c9, 0, y, 0);
  for (const side of [-1, 1])
    for (const y of (tropical?[1.6,3.6]:[1.6, 3.6, 5.6])) {
      for (const x of [-3, -1, 1, 3]) {
        box(0.85, 1.2, 0.14, 0x4e6760, x, y, side * 3.3);
        box(0.06, 1.2, 0.18, 0xece0bf, x, y, side * 3.32);
        box(0.85, 0.06, 0.18, 0xece0bf, x, y, side * 3.32);
      }
      for (const z of [-2, 0, 2]) {
        box(0.14, 1.2, 0.8, 0x4e6760, side * 4.05, y, z);
        box(0.18, 1.2, 0.06, 0xece0bf, side * 4.07, y, z);
      }
    }
  const roof = new THREE.CylinderGeometry(0, 6.15, 2, 4);
  roof.rotateY(Math.PI / 4);
  roof.scale(1, 1, 0.86);
  geometry(roof, 0x81563c, 0, tropical?5.5:7.5, 0);
  if(!tropical)box(0.7, 2.2, 0.8, 0xa18970, -2.4, 7.7, -1);
  if(tropical){
    // Wraparound upper veranda keeps every path entrance unobstructed.
    box(9.3,.18,8.3,0xf0e5c9,0,2.5,0);
    for(const side of [-1,1]){
      box(9,.12,.12,0xece0bf,0,3.4,side*4);
      box(.12,.12,8,0xece0bf,side*4.5,3.4,0);
      for(let n=-4;n<=4;n++)box(.08,.9,.08,0xece0bf,n,2.95,side*4);
      for(let n=-3;n<=3;n++)box(.08,.9,.08,0xece0bf,side*4.5,2.95,n);
    }
  }
  // Verandas and doorways face all four cardinal path entrances.
  for (const side of [-1, 1]) {
    box(2.6, 0.2, 1.3, 0xf0e5c9, 0, 2.1, side * 3.9);
    box(1, 1.7, 0.15, 0x43574c, 0, 1, side * 3.3);
    for (const x of [-1.1, 1.1])
      box(0.12, 1.9, 0.12, 0xf0e5c9, x, 1.05, side * 4.35);
    box(0.15, 1.7, 1, 0x43574c, side * 4.06, 1, 0);
  }
  for (const [color, geos] of batches) {
    const m = new THREE.Mesh(
      mergeGeometries(geos),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    );
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    geos.forEach((g) => g.dispose());
  }
  return group;
}
