import {originalActorLanding} from './original-actor-landing.js';
import {originalActorMotionTail} from './original-actor-motion-tail.js';
// Full contact-to-stop decision. Stopped-shot accounting follows separately.
export function originalPostContactMotion(snapshot,resolve){
 const landing=originalActorLanding(snapshot,resolve);
 const tail=originalActorMotionTail(landing.state,resolve,{checkNearby:landing.landed});
 return {...landing,...tail,calls:[...landing.calls,...tail.calls]};
}
