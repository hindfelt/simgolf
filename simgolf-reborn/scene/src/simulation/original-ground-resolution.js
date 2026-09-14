import {originalActorGroundDecision} from './original-actor-ground-decision.js';
import {originalActorGroundReflection} from './original-actor-ground-reflection.js';
import {originalContactResolution} from './original-contact-resolution.js';
import {originalResolvedCupCompletion} from './original-resolved-cup-completion.js';
// Ground branch through ordinary scoring or continued motion.
export function originalGroundResolution(snapshot,resolve,resolveSpecial){
 const decision=originalActorGroundDecision(snapshot,resolve);
 if(decision.captured){
  const cup=originalResolvedCupCompletion(decision.state,resolve,resolveSpecial);
  return {...cup,captured:true,accounted:true,randomDraws:decision.randomDraws,calls:[...decision.calls,...cup.calls]};
 }
 const reflection=originalActorGroundReflection(decision.state,resolve);
 const contact=originalContactResolution(reflection.state,resolve);
 return {...contact,captured:false,reflectedX:reflection.reflectedX,reflectedZ:reflection.reflectedZ,randomDraws:decision.randomDraws+contact.randomDraws,calls:[...decision.calls,...reflection.calls,...contact.calls]};
}
