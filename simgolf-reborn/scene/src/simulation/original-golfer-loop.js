import {originalRandom} from './original-rng.js';
import {originalActorTurn} from './original-actor-turn.js';

// 0x428100–0x42960a: visit every packed actor in native order. An unresolved
// turn continuation is returned with its locals, never silently skipped.
export function originalGolferLoop(snapshot,resolve,resolveSpecial){
 return runSlots(snapshot,resolve,resolveSpecial,0,0,[]);
}
function runSlots(snapshot,resolve,resolveSpecial,startSlot,randomDraws,calls){
 let state=structuredClone(snapshot);
 if(!Array.isArray(state.actors)||state.actors.length!==152||state.actors.some(b=>!(b instanceof Uint8Array)||b.length!==256))throw Error('Original golfer loop requires 152 actor records.');
 for(let id=startSlot;id<152;id++){
  const b=state.actors[id];
  if(b[0x29]===0)continue;
  if(b[0x29]===255){
   const rng=originalRandom(state.seed);
   if(b[0x8c]===0&&rng.next(100)===0){
    const f=state.facilityRecords;
    if(!(f instanceof Uint8Array)||f.length<16)throw Error('Original waiting actor requires the first facility record.');
    const v=new DataView(f.buffer,f.byteOffset,f.byteLength),a=new DataView(b.buffer,b.byteOffset,b.byteLength);
    a.setInt32(8,(v.getInt16(2,true)<<10)+1536,true);
    a.setInt32(12,(v.getInt16(4,true)<<10)+1536,true);
   }
   if(b[0x8c]!==0&&rng.next(2)!==0)b[0x8c]--;
   state.seed=rng.state;randomDraws+=rng.draws;continue;
  }
  state.actorId=id;
  const turn=originalActorTurn(state,resolve,resolveSpecial);
  state=turn.state;randomDraws+=turn.randomDraws??0;calls.push(...turn.calls);
  if(!['skip','0x4295ef'].includes(turn.next))return {...turn,state,randomDraws,calls,completed:false};
 }
 return {state,randomDraws,calls,next:'complete',completed:true};
}

// Resume only the suspended actor body, then continue at its following slot.
// resumeTurn performs the pending native continuation and returns ONLY its new
// calls/randomDraws. It must not replay the actor prefix or prior slots.
export function resumeOriginalGolferLoop(suspended,resumeTurn,resolve,resolveSpecial){
 const slot=suspended?.state?.actorId;
 if(suspended?.completed!==false||!Number.isInteger(slot)||slot<0||slot>=152||
  !Array.isArray(suspended.calls)||!Number.isInteger(suspended.randomDraws)||suspended.randomDraws<0||
  typeof resumeTurn!=='function')throw Error('Invalid original golfer continuation.');
 const turn=resumeTurn(structuredClone(suspended));
 if(!turn?.state||typeof turn.then==='function'||turn.state.actorId!==slot||!Array.isArray(turn.calls)||
  (turn.randomDraws!==undefined&&(!Number.isInteger(turn.randomDraws)||turn.randomDraws<0)))throw Error('Expected synchronous original golfer continuation result.');
 const state=structuredClone(turn.state),calls=[...structuredClone(suspended.calls),...structuredClone(turn.calls)],randomDraws=suspended.randomDraws+(turn.randomDraws??0);
 if(!['skip','0x4295ef'].includes(turn.next))return {...structuredClone(turn),state,calls,randomDraws,completed:false};
 return runSlots(state,resolve,resolveSpecial,slot+1,randomDraws,calls);
}
