import {originalWalkingRate} from './original-walking-rate.js';
import {originalWalkingPositionStep} from './original-walking-position-step.js';
export function originalWalkingStep(snapshot,resolve){
 const rate=originalWalkingRate(snapshot,resolve);
 if(rate.next!=='0x42b17c')return rate;
 const step=originalWalkingPositionStep({...rate.state,walkingRate:rate.walkingRate});
 return {...rate,...step};
}
