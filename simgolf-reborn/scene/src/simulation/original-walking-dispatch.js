import {originalServiceArrival} from './original-service-arrival.js';
import {originalWalkingApproach} from './original-walking-approach.js';
import {originalWalkingFarTick} from './original-walking-far-tick.js';
import {originalWalkingNearTick} from './original-walking-near-tick.js';
export function originalWalkingDispatch(snapshot,resolve){
 return originalWalkingFromApproach(originalWalkingApproach(snapshot,resolve),resolve);
}
export function originalWalkingFromApproach(approach,resolve){
 if(approach.next==='0x42a019'){
  const visit=originalServiceArrival(approach.state,resolve);
  return {...approach,...visit,calls:[...approach.calls,...visit.calls],randomDraws:(approach.randomDraws??0)+visit.randomDraws};
 }
 if(approach.next!=='0x42a71c')return approach;
 let walking=originalWalkingNearTick({...approach.state,destination:approach.destination,distance:approach.distance,delta:approach.delta,followPartner:approach.followPartner},resolve);
 if(walking.next==='0x42aa30')walking=originalWalkingFarTick({...walking.state,previousFacing:walking.previousFacing},resolve);
 return {...approach,...walking,calls:[...approach.calls,...walking.calls],randomDraws:(approach.randomDraws??0)+(walking.randomDraws??0)};
}
