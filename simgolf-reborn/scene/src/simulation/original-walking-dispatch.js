import {originalWalkingApproach} from './original-walking-approach.js';
import {originalWalkingNearTick} from './original-walking-near-tick.js';
export function originalWalkingDispatch(snapshot,resolve){
 const approach=originalWalkingApproach(snapshot,resolve);
 if(approach.next!=='0x42a71c')return approach;
 const walking=originalWalkingNearTick({...approach.state,destination:approach.destination,distance:approach.distance,delta:approach.delta,followPartner:approach.followPartner});
 return {...approach,...walking,calls:[...approach.calls,...walking.calls],randomDraws:(approach.randomDraws??0)+(walking.randomDraws??0)};
}
