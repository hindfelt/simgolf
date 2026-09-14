import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function adobeRoof(width,depth){
 const parts=[new THREE.BoxGeometry(width,.22,depth)];
 for(const side of [-1,1]){
  const a=new THREE.BoxGeometry(width,.48,.18);a.translate(0,.28,side*(depth/2-.09));parts.push(a);
  const b=new THREE.BoxGeometry(.18,.48,depth);b.translate(side*(width/2-.09),.28,0);parts.push(b);
 }
 const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());return geometry;
}
