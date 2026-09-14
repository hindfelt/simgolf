import {originalWalkingStep} from './original-walking-step.js';
import {originalWalkingPostStep} from './original-walking-post-step.js';
export function originalWalkingCompleteStep(snapshot,resolve){
 const movement=originalWalkingStep(snapshot,resolve);
 if(movement.next==='0x4295e6'){
  const b=movement.state.actors[movement.state.actorId];new DataView(b.buffer,b.byteOffset,b.byteLength).setInt16(0x1c,0,true);
  return {...movement,next:'skip'};
 }
 const post=originalWalkingPostStep(movement.state,resolve);
 return {...movement,...post,calls:[...movement.calls,...post.calls]};
}
