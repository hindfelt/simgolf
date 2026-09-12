import {originalActorContact} from './original-actor-contact.js';
import {originalActorLandingDeflection} from './original-actor-landing-deflection.js';
export function originalActorLanding(snapshot,resolve){
 const contact=originalActorContact(snapshot,resolve);
 if(!contact.landed)return {...contact,luckAdjusted:false};
 const deflection=originalActorLandingDeflection(contact.state,resolve);
 return {...deflection,landed:true,stoppedByTerrain:contact.stoppedByTerrain,randomDraws:contact.randomDraws+deflection.randomDraws,calls:[...contact.calls,...deflection.calls]};
}
