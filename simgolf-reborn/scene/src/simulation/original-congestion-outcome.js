import {originalWalkingCongestion} from './original-walking-congestion.js';
import {originalCongestionDeparture} from './original-congestion-departure.js';
export function originalCongestionOutcome(snapshot,resolve){
 const congestion=originalWalkingCongestion(snapshot);
 if(congestion.next!=='0x42adac')return {...congestion,calls:[]};
 return {...congestion,...originalCongestionDeparture(congestion.state,resolve)};
}
