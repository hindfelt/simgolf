import {originalActorAirPhase} from './original-actor-air-phase.js';
import {originalPostContactMotion} from './original-post-contact-motion.js';
// Air branch after position/gravity through the motion-stop decision.
export function originalAirborneMotion(snapshot,resolve){
 const air=originalActorAirPhase(snapshot,resolve);
 const contact=originalPostContactMotion(air.state,resolve);
 return {...contact,hit:air.hit,randomDraws:air.randomDraws+contact.randomDraws,calls:[...air.calls,...contact.calls]};
}
