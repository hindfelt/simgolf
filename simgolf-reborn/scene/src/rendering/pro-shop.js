import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {height} from '../landscape.js';

export function proShop(scene,x,z,environment=null){
 const tropical=environment==='tropical',links=environment==='links';
 const group=new THREE.Group(),batches=new Map();group.position.set(x,height(x,z),z);scene.add(group);
 const add=(geo,color,x,y,z)=>{geo.translate(x,y,z);if(!batches.has(color))batches.set(color,[]);batches.get(color).push(geo);};
 const box=(w,h,d,color,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),color,x,y,z);
 const wall=tropical?0xb68b52:links?0xb7b3a1:0xe3d5b1,trim=tropical?0x62452c:0x486050,roofColor=tropical?0xcdb272:links?0x59686a:0x78573a;
 box(4.5,.14,4.4,0xa69b80,0,.07,0);
 box(3.6,2.6,3.3,wall,0,1.4,-.25);
 if(tropical){
  for(let n=-1.7;n<=1.7;n+=.25)box(.035,2.4,3.34,trim,n,1.4,-.25);
 }else{
  for(let y=.4;y<2.6;y+=.3)box(3.64,.025,3.34,links?0x8c8d80:0xc5b994,0,y,-.25);
 }
 // A recessed entrance and two glazed displays distinguish the shop from food service.
 box(.78,1.95,.08,0x263d37,0,1.1,1.44);
 box(.08,2,.15,trim,-.44,1.12,1.5);box(.08,2,.15,trim,.44,1.12,1.5);
 for(const side of [-1,1]){
  box(.95,1.1,.08,0x375951,side*1.14,1.65,1.44);
  box(1.08,.09,.2,trim,side*1.14,1.05,1.5);
  box(.06,1.15,.15,wall,side*1.14,1.65,1.5);
 }
 const roof=new THREE.CylinderGeometry(0,3.2,1.25,4);roof.rotateY(Math.PI/4);add(roof,roofColor,0,3.3,-.25);
 for(let n=0;n<5;n++){const f=(n+.5)/5;for(const side of [-1,1])box(4.5*(1-f),.025,.05,tropical?0xb99a60:0x667264,0,2.68+f*1.25,-.25+side*2.25*(1-f));}
 // Shaded entrance porch, without a counter blocking the doorway.
 box(2.6,.12,.75,roofColor,0,2.46,1.78);
 for(const side of [-1,1])box(.1,2.35,.1,trim,side*1.2,1.3,2.08);
 box(2.5,.14,.55,0xc5b99a,0,.2,1.92);
 // Club rack and golf-ball emblem remain readable from the isometric camera.
 box(.65,.12,.35,trim,1.65,.35,1.87);
 for(let n=0;n<3;n++){box(.035,1.05,.035,0xc4c9bd,1.45+n*.18,.9,1.88);box(.14,.1,.09,0x454c48,1.5+n*.18,1.43,1.88);}
 box(1.5,.38,.1,trim,0,2.25,1.52);
 add(new THREE.SphereGeometry(.14,10,8),0xf1ebcf,0,2.25,1.63);
 for(const [color,geos] of batches){const mesh=new THREE.Mesh(mergeGeometries(geos),new THREE.MeshStandardMaterial({color,roughness:1}));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);geos.forEach(g=>g.dispose());}
 return group;
}
