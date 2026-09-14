import {originalMapDistance} from './original-route-distance.js';
import {originalBallStopped} from './original-ground-motion.js';
// 0x42c9ea–0x42ca9d. Noncontact motion enters directly at 0x42ca6c.
export function originalActorMotionTail(snapshot,resolve,{checkNearby=true}={}){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function actor(index){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original motion-tail actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 if(checkNearby&&actor(id).getInt32(0xf0,true)>200){
  for(let i=0;i<152;i++){
   const other=actor(i),hole=other.getUint8(0x29),a=actor(id);
   if(hole===0||other.getInt32(0xdc,true)===0||hole===a.getUint8(0x29)||hole===19)continue;
   const distance=originalMapDistance((a.getInt32(0xdc,true)-other.getInt32(8,true))|0,(a.getInt32(0xe0,true)-other.getInt32(12,true))|0);
   const threshold=Math.trunc(((state.difficulty+2)<<10)/2);
   if(distance>=threshold)continue;
   const e={address:0x4672d0,args:[i,9,20]};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original nearby reaction.');state=structuredClone(r.state);
  }
 }
 const a=actor(id),stopped=originalBallStopped({speed:a.getInt32(0xec,true),height:a.getInt32(0xe4,true),verticalSpeed:a.getInt32(0xf0,true)});
 if(stopped)a.setInt32(0xec,0,true);
 return {state,calls,stopped,next:stopped?'0x42ca9d':'0x4295ef'};
}
