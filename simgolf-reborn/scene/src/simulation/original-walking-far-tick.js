import {originalWalkingPathfinderRoute} from './original-walking-pathfinder-route.js';
import {originalWalkingRouteReactions} from './original-walking-route-reactions.js';
import {originalWalkingAvoidance} from './original-walking-avoidance.js';
import {originalWalkingCongestion} from './original-walking-congestion.js';
import {originalWalkingCompleteStep} from './original-walking-complete-step.js';
import {originalRandom} from './original-rng.js';
export function originalWalkingFarTick(snapshot,resolve){
 let result=originalWalkingPathfinderRoute(snapshot,resolve);
 const join=part=>{result={...result,...part,calls:[...result.calls,...(part.calls??[])],randomDraws:(result.randomDraws??0)+(part.randomDraws??0)};};
 if(result.next==='0x42abda')join(originalWalkingRouteReactions(result.state,resolve));
 if(!['0x42a758','0x42a75c'].includes(result.next))return result;
 const state=result.state,b=state.actors[state.actorId],a=new DataView(b.buffer,b.byteOffset,b.byteLength);
 // Shared reversal pause at 0x42a75c; retained routes also pass through it.
 if(state.reversalCheck&&a.getInt8(0x22)===(state.previousFacing^4)){
  const rng=originalRandom(state.seed);a.setInt16(0xa6,-8-rng.next(4),true);state.seed=rng.state;result.randomDraws++;a.setUint8(0x25,11);
 }
 join(originalWalkingAvoidance(state,resolve));
 if(['0x42ad32','0x42ad3b'].includes(result.next))join(originalWalkingCongestion({...result.state,congestionEntry:result.next}));
 if(result.next==='0x42af66')join(originalWalkingCompleteStep(result.state,resolve));
 return result;
}
