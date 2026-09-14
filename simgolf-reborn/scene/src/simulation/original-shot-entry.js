import {originalHeading} from './original-heading.js';
import {originalMapDistance} from './original-route-distance.js';

// Native 0x42b3f2–0x42b55c: turn wait, partner-facing wait and near-cup
// completion. Subsequent aiming/launch and score settlement remain continuations.
export function originalShotEntry(snapshot,resolve) {
 let state=structuredClone(snapshot);const calls=[];
 function actor(id){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original shot-entry actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const id=state.actorId,a=actor(id),speed=a.getInt32(0xec,true);
 if(typeof state.closerToCup!=='boolean')throw Error('Original shot-entry turn decision is unavailable.');
 if(speed===0&&state.closerToCup)return {state,calls,next:'0x42d23c'};
 if(speed!==0)return {state,calls,next:'0x42b825'};
 a.setUint32(0x18,a.getUint32(0x18,true)&0xffffe7ff,true);
 const p=actor(a.getInt16(0xaa,true));
 if(p.getUint8(0x29)!==0&&p.getInt8(0x25)<(a.getUint8(0x2a)!==0?6:7)){
  const heading=originalHeading((p.getInt32(8,true)-a.getInt32(8,true))|0,(p.getInt32(12,true)-a.getInt32(12,true))|0);
  a.setUint8(0x22,((((heading>>28)&15)+1)>>1)&7);a.setUint8(0x25,11);a.setInt16(0x1c,0,true);
  return {state,calls,next:'skip'};
 }
 if((a.getUint8(0x20)&0xe0)!==0x20){
  const hole=a.getInt8(0x29),target=state.holeTargets?.[hole];
  if(!target||![target.x,target.z].every(n=>Number.isInteger(n)&&n>=0&&n<50))throw Error('Original shot-entry cup is unavailable.');
  const distance=originalMapDistance((a.getInt32(0xdc,true)-(target.x<<10)-512)|0,(a.getInt32(0xe0,true)-(target.z<<10)-512)|0);
  if(distance<256){
   const index=a.getInt8(0xc2)+(a.getUint8(0x21)&7)*4;
   if(!(state.shotStatCounts instanceof Uint32Array)||index<0||index>=state.shotStatCounts.length||!(state.holeStrokeTotals instanceof Uint16Array)||hole<0||hole>=state.holeStrokeTotals.length)throw Error('Original shot-entry counters are unavailable.');
   a.setUint8(0x2a,a.getUint8(0x2a)+1);state.shotStatCounts[index]++;state.holeStrokeTotals[hole]++;
   if(typeof resolve!=='function')throw Error('Original hole completion requires an explicit resolver.');
   const event={address:0x426b00,args:[id]};calls.push(event);const reply=resolve(structuredClone(event),structuredClone(state));
   if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original hole completion state.');
   state=structuredClone(reply.state);return {state,calls,next:'skip'};
  }
 }
 return {state,calls,next:'0x42b55c'};
}
