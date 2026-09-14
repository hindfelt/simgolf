import {originalWalkingFarRoute} from './original-walking-far-route.js';
import {originalPathfinder} from './original-pathfinder.js';
// Execute the actual search at the far-walk call boundary. Reactions remain effects.
export function originalWalkingPathfinderRoute(snapshot,resolve){
 return originalWalkingFarRoute(snapshot,(event,state)=>{
  if(event.address!==0x42def0)return resolve(event,state);
  const [x,z,ox,oz,actorId]=event.args;
  const route=originalPathfinder({...state,actorId,origin:{x:ox,z:oz},destination:{x,z}});
  if(route.next!=='return')throw Error('Original pathfinder debug display requires a continuation.');
  // The search's argument locals must not replace the caller's world fields.
  const next={...route.state};
  if(Object.hasOwn(state,'origin'))next.origin=state.origin;else delete next.origin;
  return {state:next,value:route.value};
 });
}
