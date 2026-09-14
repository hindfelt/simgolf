import {originalWalkingPrelude} from './original-walking-prelude.js';
import {originalWalkingDispatch,originalWalkingFromApproach} from './original-walking-dispatch.js';
import {originalWalkingArrivalGate} from './original-walking-arrival-gate.js';
import {originalCongestionDeparture} from './original-congestion-departure.js';
export function originalWalkingFlow(snapshot,resolve){
 const prelude=originalWalkingPrelude(snapshot,resolve);
 if(prelude.next==='skip')return prelude;
 let walking;
 if(prelude.next==='0x4290ca')walking=originalWalkingDispatch(prelude.state,resolve);
 else if(prelude.next==='0x429f27'){
  const arrival=originalWalkingArrivalGate({...prelude.state,destination:prelude.destination});
  walking=originalWalkingFromApproach({...arrival,calls:[],randomDraws:0,followPartner:prelude.state.followPartner},resolve);
 }else return prelude;
 let result={...prelude,...walking,calls:[...prelude.calls,...walking.calls],randomDraws:(prelude.randomDraws??0)+(walking.randomDraws??0)};
 if(result.next==='0x42adac'){
  const departure=originalCongestionDeparture(result.state,resolve);
  result={...result,...departure,calls:[...result.calls,...departure.calls]};
 }
 return result;
}
