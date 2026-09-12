import {originalWalkingPreparation} from './original-walking-preparation.js';
import {originalWalkingArrivalGate} from './original-walking-arrival-gate.js';

// 0x4290ca through the arrival gate, with remaining movement/service bodies explicit.
export function originalWalkingApproach(snapshot,resolve){
 const prepared=originalWalkingPreparation(snapshot,resolve);
 if(prepared.next!=='0x429f27')return prepared;
 const arrival=originalWalkingArrivalGate({...prepared.state,destination:prepared.destination,serviceIndex:prepared.serviceIndex??snapshot.serviceIndex??-1});
 return {...prepared,...arrival};
}
