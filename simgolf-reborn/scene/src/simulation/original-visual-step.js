import {originalRandom} from './original-rng.js';
import {originalHeading} from './original-heading.js';
import {originalWalkingOctant} from './original-walking-near-steering.js';
import {originalTerrainByte} from './original-terrain-byte.js';
const xs=[0,1,1,1,0,-1,-1,-1],zs=[-1,-1,0,1,1,1,0,-1];
// 0x403634–0x40383c: collision pauses, terrain speed and one visual step.
// Caller must have completed target/path selection and entered this branch.
export function originalVisualStep(snapshot,slot){
 const state=structuredClone(snapshot),bytes=state.visualRecords?.[slot];
 if(!Number.isInteger(slot)||slot<0||slot>=64||!(bytes instanceof Uint8Array)||bytes.length!==76)throw Error('Original visual movement slot unavailable.');
 const r=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),rng=originalRandom(state.seed);
 for(let i=0;i<slot;i++){
  const other=state.visualRecords[i];if(!(other instanceof Uint8Array)||other.length!==76)throw Error('Original preceding visual record unavailable.');
  if(!other[0x12])continue;
  const v=new DataView(other.buffer,other.byteOffset,other.byteLength),dx=(v.getInt32(0,true)-r.getInt32(0,true))|0,dz=(v.getInt32(4,true)-r.getInt32(4,true))|0;
  const ax=Math.abs(dx)|0,az=Math.abs(dz)|0,distance=Math.trunc(((ax>az?az+Math.imul(ax,2):ax+Math.imul(az,2))|0)/2);
  if(distance<341){
   const facing=originalWalkingOctant(dx,dz),current=r.getInt8(0x16);
   if(current===facing||current===((facing+1)&7)||current===((facing-1)&7)){
    r.setInt16(0x1a,rng.next(4)+4,true);r.setInt16(0x1e,11,true);
   }
  }
  if(r.getInt16(0x1a,true)!==0)r.setUint8(0x16,((((originalHeading(dx,dz)>>28)&15)+1)>>1)&7);
 }
 const x=r.getInt32(0,true),z=r.getInt32(4,true),index=(x>>10)*50+(z>>10),code=originalTerrainByte(state,x>>10,z>>10);
 const cost=state.metadata?.[code]?.walkingCost;
 if(!Number.isInteger(cost)||!(state.tileFlags instanceof Uint16Array)||index<0||index>=state.tileFlags.length)throw Error('Original visual terrain speed unavailable.');
 let speed=Math.max(2,Math.min(5,6-((cost<<24)>>24)));
 if(state.tileFlags[index]&32)speed=6;
 if(r.getUint8(0x12)&8)speed+=2;
 if(r.getUint8(0x13)===250)speed+=2;
 if(r.getUint8(0x12)&16)speed=3;
 const facing=r.getInt8(0x16);if(facing<0||facing>7)throw Error('Original visual facing unavailable.');
 const divisor=(facing&1)+3;
 r.setInt32(0,x+Math.trunc(xs[facing]*speed*32/divisor),true);
 r.setInt32(4,z+Math.trunc(zs[facing]*speed*32/divisor),true);
 r.setInt16(0x18,r.getInt16(0x18,true)-1,true);
 if(r.getInt16(0x18,true)!==0&&rng.next(4)===0)r.setInt16(0x18,r.getInt16(0x18,true)-1,true);
 let animation=r.getInt16(0x1e,true);
 if(animation>=7){animation=(animation+1)<<16>>16;r.setInt16(0x1e,animation,true);}
 else r.setInt16(0x1e,7,true);
 if(animation>10)r.setInt16(0x1e,7,true);
 state.seed=rng.state;return {state,randomDraws:rng.draws,next:'skip'};
}
