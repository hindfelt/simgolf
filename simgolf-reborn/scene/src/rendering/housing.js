import {adobeRoof} from './adobe-roof.js';
import * as THREE from "three";
import { height } from "../landscape.js";
export function housing(scene, type, x, z, environment=null) {
  const tropical=environment==='tropical',links=environment==='links',desert=environment==='desert';
  const wall=tropical?0xba925e:links?0xb8b6a2:desert?0xd0aa79:0xe0d1aa,trim=tropical?0x6b4930:0x586b59;
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
    box(3.8, 2.4, 3.4, wall, 0, 1.3, 0);
    const roof = new THREE.Mesh(
      desert?adobeRoof(4.2,3.8):new THREE.CylinderGeometry(0, 3.1, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: tropical?0xcfb67b:links?0x5a686a:desert?0xe7c895:0x80604b, roughness: 1 }),
    );
    roof.rotation.y = desert?0:Math.PI / 4;
    roof.position.y = desert?2.65:3.1;
    roof.scale.z = desert?1:0.9;
    roof.castShadow = true;
    group.add(roof);
    box(0.75, 1.5, 0.1, 0x586b59, 0, 0.85, 1.75);
    for (const x of [-1.25, 1.25]) box(0.7, 0.85, 0.1, 0x688c91, x, 1.5, 1.75);
    box(1.1, 0.1, 1, 0xb6ac8c, 0, 0.16, 2.25);
    if(!tropical&&!desert)box(0.45, 1.2, 0.5, links?0x999b8c:0x9f8266, 1.1, 3.35, -0.4);
    if(tropical){
      // A shaded timber veranda replaces the chimney and paved doorstep.
      box(3.7,.18,1,0xaa8654,0,.22,2.15);
      box(3.8,.13,1.15,0xcfb67b,0,2.5,2.08);
      for(const side of [-1,1])box(.12,2.25,.12,trim,side*1.7,1.38,2.55);
      for(let px=-1.75;px<1.9;px+=.25)box(.035,2.2,3.43,trim,px,1.3,0);
    }else if(links){
      for(let y=.3;y<2.5;y+=.3)box(3.83,.025,3.43,0x8b9084,0,y,0);
    }
    for(const side of [-1,1]){
      box(.08,.85,.8,0x526d66,side*1.94,1.45,-.3);
      box(.13,.06,.85,wall,side*1.97,1.45,-.3);
    }
  }
  scene.add(group);
  return group;
}
