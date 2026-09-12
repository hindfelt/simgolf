import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { height } from "../landscape.js";
export function transportFacility(scene, type, x, z) {
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
  const cylinder = (radius, h, color, x, y, z) =>
    add(new THREE.CylinderGeometry(radius, radius, h, 24), color, x, y, z);
  if (type === "marina") {
    box(13.6, 0.22, 3.6, 0xa49376, 0, 0.15, -3);
    box(5.6, 2.1, 2.7, 0xd8cead, -3.5, 1.3, -3.1);
    box(6.1, 0.2, 3.2, 0x6a8278, -3.5, 2.45, -3.1);
    box(2.5, 1.3, 0.05, 0x587a7a, -3.5, 1.35, -1.73);
    box(13.4, 0.22, 0.9, 0x9b7953, 0, 0.28, -0.8);
    for (const px of [-5.7, -1.9, 1.9, 5.7]) {
      box(0.65, 0.2, 5.4, 0xb3905c, px, 0.3, 2);
      for (const pz of [-0.8, 4.6]) cylinder(0.1, 1, 0x685f4b, px, 0.4, pz);
    }
    for (const [px, pz] of [
      [-3.8, 2.2],
      [3.8, 2.7],
    ]) {
      const hull = new THREE.SphereGeometry(1, 12, 6);
      hull.scale(0.7, 0.36, 1.65);
      add(hull, 0xe4dfc9, px, 0.37, pz);
      box(0.85, 0.5, 1.2, 0xf1ebd7, px, 0.78, pz);
      box(0.78, 0.22, 0.6, 0x53777c, px, 0.98, pz - 0.12);
      box(0.05, 2.3, 0.05, 0x968c71, px, 1.6, pz + 0.4);
    }
  } else if (type === "helipad") {
    box(9.6, 0.18, 9.6, 0x98998b, 0, 0.1, 0);
    cylinder(3.7, 0.035, 0x55655e, 0, 0.21, 0);
    add(
      new THREE.TorusGeometry(3.25, 0.065, 4, 48).rotateX(Math.PI / 2),
      0xe9dfb5,
      0,
      0.25,
      0,
    );
    for (const px of [-0.8, 0.8]) box(0.23, 0.025, 2.4, 0xf2e8ca, px, 0.26, 0);
    box(1.6, 0.025, 0.23, 0xf2e8ca, 0, 0.26, 0);
    for (const px of [-4.3, 4.3])
      for (const pz of [-4.3, 4.3]) cylinder(0.1, 0.12, 0xe8b958, px, 0.3, pz);
    box(1.7, 1.7, 1.5, 0xcbc2a3, 3.5, 1, -3.6);
  } else {
    // Compact airfield: a 58-unit runway is nearly six helipad widths long.
    group.position.y += 0.35;
    box(61.6, 0.7, 13.6, 0x8a9269, 0, -0.15, 0);
    box(58, 0.055, 4.8, 0x747b73, 0, 0.18, -2);
    for (const pz of [-4.05, 0.05]) box(56, 0.01, 0.07, 0xd9d7bd, 0, 0.22, pz);
    for (let px = -25; px <= 25; px += 5)
      box(2, 0.015, 0.12, 0xe4dfc5, px, 0.23, -2);
    for (const side of [-1, 1])
      for (const pz of [-3.5, -2.5, -1.5, -0.5])
        box(1.6, 0.012, 0.16, 0xe4dfc5, side * 27, 0.23, pz);
    box(21, 0.04, 5.7, 0xa3a18d, 15, 0.2, 3.5);
    box(7, 2.8, 4.3, 0xb6b8a8, 23, 1.65, 4.3);
    box(7.5, 0.2, 4.8, 0x697875, 23, 3.1, 4.3);
    box(5.8, 2.2, 0.06, 0x566661, 23, 1.4, 2.12);
    box(3.5, 1.8, 2.8, 0xd8cfaf, 15, 1.13, 5);
    cylinder(0.07, 3.2, 0xd4c7a3, -25, 1.7, 4);
    const sock = new THREE.ConeGeometry(0.3, 1.3, 8);
    sock.rotateZ(-Math.PI / 2);
    add(sock, 0xd7944e, -24.4, 3.1, 4);
  }
  for (const [color, geos] of batches) {
    const mesh = new THREE.Mesh(
      mergeGeometries(geos),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    for (const geo of geos) geo.dispose();
  }
  if(type==='marina'){
    const boat=new THREE.Group();boat.position.set(0,0,1.7);group.add(boat);group.userData.marinaBoat=boat;
    const part=(geometry,color,x,y,z)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.7}));mesh.position.set(x,y,z);mesh.castShadow=true;boat.add(mesh);return mesh;};
    const hull=new THREE.SphereGeometry(1,12,6);hull.scale(.7,.36,1.65);
    part(hull,0xe4dfc9,0,.37,0);
    part(new THREE.BoxGeometry(.85,.5,1.2),0xf1ebd7,0,.78,0);
    part(new THREE.BoxGeometry(.78,.22,.6),0x53777c,0,.98,-.12);
    part(new THREE.BoxGeometry(.05,2.3,.05),0x968c71,0,1.6,.4);
  }
  if(type==='airstrip'){
    const plane=new THREE.Group();plane.visible=false;group.add(plane);group.userData.aircraft=plane;
    const part=(geometry,color,x,y,z)=>{const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.6}));m.position.set(x,y,z);m.castShadow=true;plane.add(m);return m;};
    const body=new THREE.SphereGeometry(1,16,8);body.scale(2.15,.32,.38);part(body,0xeee4c8,0,.8,0);
    part(new THREE.BoxGeometry(1,.1,5.7),0xeee4c8,0,1.02,0);
    part(new THREE.BoxGeometry(.8,.8,.13),0x923e35,1.6,1.2,0);
    part(new THREE.BoxGeometry(.8,.09,2),0xeee4c8,1.6,1.02,0);
    part(new THREE.BoxGeometry(.7,.35,.58),0x345e70,-.5,1.07,0);
    for(const z of [-.55,.55])part(new THREE.SphereGeometry(.15,8,6),0x343b39,.25,.3,z);
    part(new THREE.SphereGeometry(.12,8,6),0x343b39,-1.5,.3,0);
    const prop=part(new THREE.BoxGeometry(.07,1.4,.09),0x343b39,-2.18,.8,0);plane.userData.propeller=prop;
  }
  scene.add(group);
  return group;
}
