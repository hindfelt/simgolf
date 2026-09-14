import {originalFacilityArrival} from './original-facility-arrival.js';
import {originalRestVisit} from './original-rest-visit.js';
import {originalArrivalPartner} from './original-arrival-partner.js';
// Dispatch at 0x42a019; subsequent shot/late-wait execution stays explicit.
export function originalServiceArrival(snapshot,resolve){
 const index=snapshot.serviceIndex;
 if(!Number.isInteger(index)||index< -2||index>=256)throw Error('Original service index unavailable.');
 if(index>=0)return originalFacilityArrival(snapshot,resolve);
 let state=snapshot,calls=[],randomDraws=0;
 if(index===-2){
  const {x,z}=state.actorTile??{},i=x*50+z,decorations=state.restDecorations;
  if(!(decorations instanceof Uint8Array)||decorations.length!==2500||!Number.isInteger(i)||i<0||i>=2500)throw Error('Original rest decoration map unavailable.');
  const rest=originalRestVisit({...state,restDecoration:decorations[i]},resolve);
  state=rest.state;calls=rest.calls;randomDraws=rest.randomDraws;
 }
 const partner=originalArrivalPartner(state);
 return {...partner,calls,randomDraws:randomDraws+partner.randomDraws};
}
