import {originalActorShotContinuation} from './original-actor-action.js';
import {originalActorWalkingDecision} from './original-actor-walking-decision.js';
import {originalActorMotionContext} from './original-actor-motion-context.js';
import {originalActorBallMotion} from './original-actor-ball-motion.js';
// Recovered walking, shot actions and their motion continuation. Tutorial
// and retry continuations remain explicit until their bodies are recovered.
export function originalActorTurn(snapshot,resolve,resolveSpecial){
 const action=originalActorShotContinuation(originalActorWalkingDecision(snapshot,resolve),resolve);
 if(action.next!=='motion')return action;
 const b=action.state.actors[action.state.actorId],a=new DataView(b.buffer,b.byteOffset,b.byteLength);
 // 0x42bdb5: zero horizontal speed skips even with nonzero vertical velocity.
 if(a.getInt32(0xec,true)===0)return {...action,next:'skip'};
 const state=originalActorMotionContext({...action.state,visualSlot:action.visualSlot},action);
 const motion=originalActorBallMotion(state,resolve,resolveSpecial);
 return {...action,...motion,randomDraws:action.randomDraws+motion.randomDraws,calls:[...action.calls,...motion.calls]};
}
