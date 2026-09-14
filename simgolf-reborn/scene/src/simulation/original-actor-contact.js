import {originalActorBounce} from './original-actor-bounce.js';
import {originalActorImpact} from './original-actor-impact.js';

// Continuous 0x42c527–0x42c815; airborne/non-descending balls bypass impact.
export function originalActorContact(snapshot,resolve){
 const bounce=originalActorBounce(snapshot,resolve);
 if(!bounce.landed)return {...bounce,randomDraws:0,stoppedByTerrain:false};
 const impact=originalActorImpact(bounce.state,resolve);
 return {...impact,landed:true,calls:[...bounce.calls,...impact.calls]};
}
