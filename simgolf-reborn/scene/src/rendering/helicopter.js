import * as THREE from 'three';
import { person } from '../actors.js';
export function helicopterView(scene, height) {
  const craft = new THREE.Group(); scene.add(craft);
  const material = color => new THREE.MeshStandardMaterial({color, roughness: 0.55});
  const add = (geometry,color,x,y,z,parent=craft) => {
    const mesh=new THREE.Mesh(geometry,material(color));mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
  };
  const body=add(new THREE.SphereGeometry(1,16,10),0xeee8d5,0,1.5,0);body.scale.set(1,0.9,1.7);
  const glass=add(new THREE.SphereGeometry(0.94,16,10),0x244e64,0,1.65,-0.65);glass.scale.set(.9,.7,1);
  add(new THREE.BoxGeometry(.35,.38,3.4),0x9e3e32,0,1.55,2.5);
  add(new THREE.BoxGeometry(.12,1.3,.9),0xeee8d5,0,2,3.7);
  for(const x of [-1.05,1.05]) {
    add(new THREE.BoxGeometry(.12,.12,3.2),0x373d3b,x,.4,0);
    for(const z of [-.8,.8]) add(new THREE.BoxGeometry(.12,.6,.12),0x373d3b,x,.7,z);
  }
  add(new THREE.CylinderGeometry(.1,.1,.65),0x373d3b,0,2.5,0);
  const rotor=new THREE.Group();rotor.position.y=2.85;craft.add(rotor);
  add(new THREE.BoxGeometry(7,.055,.18),0x373d3b,0,0,0,rotor);
  add(new THREE.BoxGeometry(.18,.055,7),0x373d3b,0,0,0,rotor);
  const people=[person(scene,0,0,0xa94136,0xe8e0c8).group,person(scene,0,0,0x3e6396,0xf3ecd3).group];
  craft.visible=false;
  return { update(g) {
    const h=g.helicopter; craft.visible=!!h;people.forEach(p=>p.visible=false);if(!h)return;
    const t=g.time-h.since;let x=h.pad.x,z=h.pad.z,lift=0;
    if(h.phase==='arriving') {
      const u=Math.min(1,t/24);
      if(u<.65) {const a=u/.65; x+=-75+95*a;z+=-35+30*Math.sin(a*Math.PI);lift=22;}
      else {const a=(u-.65)/.35;x+=20*(1-a);z-=35*(1-a);lift=22*(1-a);}
    } else if(h.phase==='departing') {
      const u=Math.min(1,t/20);lift=Math.min(24,u*60);x+=80*u*u;z-=60*u*u;
    }
    craft.position.set(x,height(h.pad.x,h.pad.z)+.3+lift,z);
    craft.rotation.y=h.phase==='departing'?Math.PI*.8:Math.PI*.3;
    rotor.rotation.y=h.phase==='parked'?0:g.time*35;
    if(['unloading','boarding'].includes(h.phase)) {
      const u=Math.min(1,t/5),a=h.phase==='boarding'?1-u:u;
      people.forEach((p,i)=> {p.visible=true;const px=h.pad.x+(h.entrance.x-h.pad.x)*a+(i-.5)*.8;
        const pz=h.pad.z+(h.entrance.z-h.pad.z)*a;p.position.set(px,height(px,pz)+.25,pz);});
    }
  }};
}
