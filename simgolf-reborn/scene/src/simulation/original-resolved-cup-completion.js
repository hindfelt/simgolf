import {originalCupCompletion} from './original-cup-completion.js';
import {originalHoleComplete} from './original-hole-complete.js';

// Resolve the ordinary 0x426b00 dependency with recovered hole completion.
// Presentation still requires the caller's synchronous original-state resolver.
export function originalResolvedCupCompletion(snapshot,resolve,resolveSpecial){
 let nestedCalls=[];
 const result=originalCupCompletion(snapshot,(effect,state)=>{
  if(effect.address===0x426b00){
   const completed=originalHoleComplete(state,resolve,resolveSpecial);
   if(completed.next!=='return')throw Error(`Original cup completion continuation ${completed.next} is not resolved.`);
   nestedCalls=completed.calls;
   return {state:completed.state};
  }
  if(typeof resolve!=='function')throw Error('Original cup presentation requires a resolver.');
  return resolve(effect,state);
 });
 const calls=result.calls.flatMap(effect=>effect.address===0x426b00?[effect,...nestedCalls]:[effect]);
 return {...result,calls};
}
