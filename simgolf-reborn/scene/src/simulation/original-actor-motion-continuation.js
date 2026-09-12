import {originalActorMotionContext} from './original-actor-motion-context.js';
import {originalActorBallMotion} from './original-actor-ball-motion.js';

// Continue the actor's already-resolved action without repeating decision or
// impact effects. Pre-movement locals remain those captured by the caller.
export function originalActorMotionContinuation(action,resolve,resolveSpecial){
 if(action.next!=='motion')return action;
 const b=action.state.actors[action.state.actorId],a=new DataView(b.buffer,b.byteOffset,b.byteLength);
 // 0x42bdb5: zero horizontal speed skips even with nonzero vertical velocity.
 if(a.getInt32(0xec,true)===0)return {...action,next:'skip'};
 const state=originalActorMotionContext({...action.state,visualSlot:action.visualSlot},action);
 const motion=originalActorBallMotion(state,resolve,resolveSpecial);
 return {...action,...motion,randomDraws:(action.randomDraws??0)+(motion.randomDraws??0),calls:[...action.calls,...motion.calls]};
}
