import {originalWalkingNearBehavior} from './original-walking-near-behavior.js';
import {originalWalkingCompleteStep} from './original-walking-complete-step.js';
export function originalWalkingNearTick(snapshot,resolve){
 const decision=originalWalkingNearBehavior(snapshot,resolve);
 if(decision.next!=='0x42af66')return decision;
 const step=originalWalkingCompleteStep(decision.state,resolve);
 return {...decision,...step,calls:[...decision.calls,...step.calls]};
}
