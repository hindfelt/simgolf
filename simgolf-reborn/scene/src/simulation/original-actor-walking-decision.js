import {originalActorDecision} from './original-actor-decision.js';
import {originalActorWalkingContext} from './original-actor-walking-context.js';
import {originalWalkingFlow} from './original-walking-flow.js';
// Actor decision's globalFlags and walking's worldFlags name the same native word.
export function originalActorWalkingDecision(snapshot,resolve){
 const decision=originalActorDecision(snapshot,resolve);
 if(decision.next!=='0x428ad1')return decision;
 const context=originalActorWalkingContext({...decision.state,worldFlags:decision.state.globalFlags},decision);
 const walking=originalWalkingFlow(context,(event,state)=>{
  const old=state.worldFlags;state.globalFlags=old;
  const reply=resolve(event,state);
  if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous actor walking effect.');
  if(reply.state.worldFlags===old&&reply.state.globalFlags!==old)reply.state.worldFlags=reply.state.globalFlags;
  else if(reply.state.globalFlags!==old&&reply.state.worldFlags!==reply.state.globalFlags)throw Error('Conflicting aliases for original world flags.');
  reply.state.globalFlags=reply.state.worldFlags;return reply;
 });
 walking.state.globalFlags=walking.state.worldFlags;
 return {...decision,...walking,calls:[...decision.calls,...walking.calls],randomDraws:decision.randomDraws+(walking.randomDraws??0)};
}
