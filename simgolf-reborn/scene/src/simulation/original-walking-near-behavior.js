import {originalWalkingNearSteering} from './original-walking-near-steering.js';
import {originalWalkingAvoidance} from './original-walking-avoidance.js';
import {originalWalkingCongestion} from './original-walking-congestion.js';
export function originalWalkingNearBehavior(snapshot,resolve){
 const steering=originalWalkingNearSteering(snapshot);
 if(steering.next!=='0x42a793')return {...steering,calls:[]};
 const avoidance=originalWalkingAvoidance(steering.state,resolve);
 const combined={...steering,...avoidance,randomDraws:steering.randomDraws+avoidance.randomDraws};
 if(!['0x42ad32','0x42ad3b'].includes(avoidance.next))return combined;
 const congestion=originalWalkingCongestion({...avoidance.state,congestionEntry:avoidance.next});
 return {...combined,...congestion,randomDraws:combined.randomDraws+congestion.randomDraws};
}
