import {originalActorPrelude} from './original-actor-prelude.js';
import {originalPairedUpdate} from './original-paired-update.js';
import {originalSceneryUpdate} from './original-scenery-update.js';
const actor=s=>{
 const b=s.actors?.[s.actorId];
 if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original actor check record is unavailable.');
 return new DataView(b.buffer,b.byteOffset,b.byteLength);
};
// Assemble 0x42819c–0x4285bb on raw world records. Resnapshot after each
// callback: reaction handlers may replace records, flags, RNG and map data.
export function originalActorChecks(snapshot,resolve) {
 let state=structuredClone(snapshot);const calls=[];
 function preludeSnapshot(){const a=actor(state);return {
  slot:state.actorId,seed:state.seed,phaseCounter:state.phaseCounter,difficulty:state.difficulty,
  focusActor:state.focusActor,visualOwners:state.visualOwners,
  stateFlags:a.getUint32(0x18,true),screenX:a.getInt32(0x10,true),countdown:a.getUint8(0x8c),remarkByte:a.getUint8(0x8d),actorWord:a.getInt16(0xba,true)
 };}
 function applyPrelude(s){
  actor(state).setUint8(0x8c,s.countdown);state.seed=s.seed;state.focusActor=s.focusActor;state.visualOwners=s.visualOwners.slice();
 }
 function effect(event,s){
  if(typeof resolve!=='function')throw Error('Original actor checks require an explicit effect resolver.');
  calls.push(structuredClone(event));
  const reply=resolve(structuredClone(event),structuredClone(s));
  if(!reply?.state||typeof reply.then==='function'||!Number.isInteger(reply.result))throw Error('Expected synchronous original actor check result.');
  return reply;
 }
 const prelude=originalActorPrelude(preludeSnapshot(),(event,s)=>{
  applyPrelude(s);state=structuredClone(effect(event,state).state);return preludeSnapshot();
 });
 applyPrelude(prelude.state);
 const paired=originalPairedUpdate(state,effect);state=paired.state;
 const scenery=originalSceneryUpdate(state,effect);state=scenery.state;
 const a=actor(state);
 if(a.getUint32(0x18,true)&0x200){state.trackedX=a.getInt32(8,true);state.trackedZ=a.getInt32(12,true);state.trackedFacing=a.getUint8(0x22);}
 return {state,calls,visualSlot:prelude.visualSlot,centreFlag:0,randomDraws:prelude.randomDraws+scenery.randomDraws,paired:paired.triggered,sample:scenery.sample};
}
