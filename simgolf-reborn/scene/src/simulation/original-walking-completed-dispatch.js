import {originalWalkingDispatch} from './original-walking-dispatch.js';
import {originalCongestionDeparture} from './original-congestion-departure.js';
// Complete congestion departure reached by either near or far walking.
export function originalWalkingCompletedDispatch(snapshot,resolve){
 const walking=originalWalkingDispatch(snapshot,resolve);
 if(walking.next!=='0x42adac')return walking;
 const departure=originalCongestionDeparture(walking.state,resolve);
 return {...walking,...departure,calls:[...walking.calls,...departure.calls]};
}
