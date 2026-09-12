import {originalHeading} from './original-heading.js';
import {originalRandom} from './original-rng.js';
const xs=[0,1,1,1,0,-1,-1,-1],zs=[-1,-1,0,1,1,1,0,-1];
// 0x402b6b–0x402c6f. Movement itself continues at 0x403488.
export function originalVisualFollow(snapshot,slot){
 const state=structuredClone(snapshot),bytes=state.visualRecords?.[slot];
 if(!Number.isInteger(slot)||slot<0||slot>=64||!(bytes instanceof Uint8Array)||bytes.length!==76)throw Error('Original visual follow slot unavailable.');
 const r=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(r.getInt8(0x13)<=0)return {state,next:'0x402c6f',randomDraws:0};
 const b=state.actors?.[state.selectedActor];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original followed actor unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength);
 let x=a.getInt32(0xdc,true),z=a.getInt32(0xe0,true);
 if(x===0){x=a.getInt32(8,true);z=a.getInt32(12,true);}else{x=(x+(xs[slot&7]<<10))|0;z=(z+(zs[slot&7]<<10))|0;}
 const dx=(x-r.getInt32(0,true))|0,dz=(z-r.getInt32(4,true))|0;
 // 0x466a40: signed absolute values and wrapped max*2+min, divided by 2.
 const ax=dx<0?-dx|0:dx,az=dz<0?-dz|0:dz,distance=Math.trunc(((ax>az?az+Math.imul(ax,2):ax+Math.imul(az,2))|0)/2);
 const locals={x,z,dx,dz};
 if(distance>=2048&&a.getInt16(0xa6,true)<=0&&(a.getUint8(0x2a)!==0||a.getUint8(0x29)!==1))return {state,next:'0x403488',locals,randomDraws:0};
 const heading=originalHeading(dx,dz),rng=originalRandom(state.seed);
 r.setUint8(0x16,((((heading>>28)&15)+1)>>1)&7);r.setInt16(0x1e,11,true);r.setInt16(0x1a,rng.next(16)+1,true);r.setInt16(0x18,0,true);state.seed=rng.state;
 return {state,next:'skip',locals,randomDraws:rng.draws};
}
