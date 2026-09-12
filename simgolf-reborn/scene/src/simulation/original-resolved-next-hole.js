import {originalNextHoleTransition} from './original-next-hole-transition.js';
import {originalRoundExit} from './original-round-exit.js';

// Use recovered ordinary round-exit state instead of a caller-supplied stub.
// Special visitor reward/dialogue continuation remains an explicit dependency.
export function originalResolvedNextHole(snapshot,resolveSpecial){
 return originalNextHoleTransition(snapshot,(effect,state)=>{
  if(effect.address!==0x425b50||effect.args[0]!==state.actorId)throw Error('Unexpected original next-hole effect.');
  const exit=originalRoundExit(state);
  if(exit.next==='return')return {state:exit.state};
  if(typeof resolveSpecial!=='function')throw Error(`Original special round exit ${exit.next} requires a resolver.`);
  return resolveSpecial({...effect,next:exit.next},exit.state);
 });
}
