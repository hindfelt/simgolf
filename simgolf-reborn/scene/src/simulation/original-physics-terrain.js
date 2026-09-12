import {originalHeightExtrema} from './original-corner-height.js';
const dx=[0,1,1,1,0,-1,-1,-1],dz=[-1,-1,0,1,1,1,0,-1];
function location({x,z,metadataFlags}) {
 if(![x,z,metadataFlags].every(Number.isInteger)||x<0||x>=51200||z<0||z>=51200)throw Error('Invalid original physics terrain sample.');
 return {row:x>>10,column:z>>10,u:x&1023,v:z&1023};
}
function corners(q,p) {
 if(typeof q.cornerHeight!=='function')throw Error('Original corner heights required.');
 const values=[5,7,1,3].map(d=>q.cornerHeight(p.row,p.column,d));
 if(!values.every(n=>Number.isInteger(n)&&n>=-128&&n<=127))throw Error('Invalid original physics corner height.');
 return values;
}
// 0x42f110–0x42f265, including signed 32-bit interpolation overflow.
export function originalPhysicsHeight(q) {
 const p=location(q),flags=q.metadataFlags;
 if(flags&8)return 0;
 if(flags&6){
   if(typeof q.vertexHeight!=='function')throw Error('Original vertex heights required.');
   const extrema=originalHeightExtrema(p.row,p.column,q.vertexHeight);
   return ((flags&2?extrema.minimum:extrema.maximum)-3)<<4;
 }
 const [h5,h7,h1,h3]=corners(q,p).map(n=>n-3);
 if(h5===h7&&h5===h1&&h5===h3)return h5<<4;
 const a=(Math.imul(1024-p.u,h7)+Math.imul(p.u,h1))|0;
 const b=(Math.imul(1024-p.u,h5)+Math.imul(p.u,h3))|0;
 const sum=(Math.imul(a,1024-p.v)+Math.imul(b,p.v))<<4;
 return Math.trunc(Math.trunc(sum/1024)/1024);
}
// 0x40bfe0/0x40c090 and 0x40c140. Centre-line equality selects the
// first half; odd directions clamp each component before the dot product.
export function originalPhysicsSlope(q,direction) {
 const p=location(q);
 if(!Number.isInteger(direction)||direction<0||direction>7||!Number.isInteger(q.globalFlags)||!Number.isInteger(q.terrainCode))throw Error('Invalid original slope inputs.');
 if((q.globalFlags&1)||q.terrainCode===7||q.terrainCode===9||(q.metadataFlags&14))return 0;
 const [h5,h7,h1,h3]=corners(q,p);
 let sx=p.v>512?h3-h5:h1-h7,sz=p.u>512?h3-h1:h5-h7;
 if(direction&1){sx=Math.max(-1,Math.min(1,sx));sz=Math.max(-1,Math.min(1,sz));}
 return dx[direction]*sx+dz[direction]*sz;
}
