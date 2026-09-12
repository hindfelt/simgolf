import {originalRandom} from './original-rng.js';
import {originalActorShotContinuation} from './original-actor-action.js';
import {originalActorWalkingDecision} from './original-actor-walking-decision.js';
import {originalActorMotionContext} from './original-actor-motion-context.js';
import {originalActorBallMotion} from './original-actor-ball-motion.js';
// Recovered walking, shot actions, waiting and ball motion. The first-hole
// tutorial continuation remains explicit until its UI effects are recovered.
export function originalActorTurn(snapshot,resolve,resolveSpecial){
 const action=originalActorShotContinuation(originalActorWalkingDecision(snapshot,resolve),resolve);
 if(action.next==='0x42d23c'){
  // 0x42d23c–0x42d25f: retry after a short random pause.
  const state=structuredClone(action.state),b=state.actors[state.actorId];
  const a=new DataView(b.buffer,b.byteOffset,b.byteLength),rng=originalRandom(state.seed);
  a.setInt16(0xa6,-rng.next(8),true);a.setUint8(0x28,0);a.setUint8(0x25,11);
  state.seed=rng.state;
  return {...action,state,next:'skip',randomDraws:action.randomDraws+rng.draws};
 }
 if(action.next!=='motion')return action;
 const b=action.state.actors[action.state.actorId],a=new DataView(b.buffer,b.byteOffset,b.byteLength);
 // 0x42bdb5: zero horizontal speed skips even with nonzero vertical velocity.
 if(a.getInt32(0xec,true)===0)return {...action,next:'skip'};
 const state=originalActorMotionContext({...action.state,visualSlot:action.visualSlot},action);
 const motion=originalActorBallMotion(state,resolve,resolveSpecial);
 return {...action,...motion,randomDraws:action.randomDraws+motion.randomDraws,calls:[...action.calls,...motion.calls]};
}
