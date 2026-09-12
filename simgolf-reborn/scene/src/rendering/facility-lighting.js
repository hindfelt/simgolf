import * as THREE from 'three';
const originals=new WeakMap();
// Clone on first use so status tint cannot leak into another building sharing
// materials. Always derive from original colours, never accumulate dimming.
export function facilityLighting(group,status){
 if(group.userData.connectionStatus===status)return;
 group.userData.connectionStatus=status;
 const clones=new Map();
 group.traverse(object=>{
  if(!object.material)return;
  const shade=material=>{
   let base=originals.get(material);
   if(!base){
    if(clones.has(material))material=clones.get(material);
    else {const source=material;material=source.clone();clones.set(source,material);}
    base=originals.get(material);
    if(!base){base={color:material.color?.clone(),emissive:material.emissive?.clone(),intensity:material.emissiveIntensity};originals.set(material,base);}
   }
   if(base.color){
    material.color.copy(base.color);
    if(status==='disconnected')material.color.lerp(new THREE.Color(0x777777),.3).multiplyScalar(.42);
   }
   if(base.emissive){
    material.emissive.copy(base.emissive);material.emissiveIntensity=base.intensity;
    if(status==='connected'){material.emissive.set(0x9dbb78);material.emissiveIntensity=.16;}
    else if(status==='disconnected')material.emissiveIntensity=0;
   }
   return material;
  };
  object.material=Array.isArray(object.material)?object.material.map(shade):shade(object.material);
 });
}
