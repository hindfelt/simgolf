import {originalBallPositionStep} from './original-ball-position.js';
import {originalGravityStep} from './original-bounce.js';
// Candidate simulator motion 0x421c33–0x421cd3 and airborne response
// 0x421dd6–0x421e3a. Collision and grounded response follow this step.
export function originalCandidateMotion(state,{groundBefore,groundAfter}) {
 const int=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
 if(!int(state.angularOffset)||![groundBefore,groundAfter].every(int))throw Error('Invalid original candidate motion inputs.');
 const position=originalBallPositionStep(state);
 const verticalSpeed=originalGravityStep({...position,verticalSpeed:state.verticalSpeed});
 const airborne=position.height>1;
 return {...state,...position,verticalSpeed,
   height:airborne?(position.height+groundBefore-groundAfter)|0:position.height,
   speed:airborne?(state.speed-(state.speed>>5))|0:state.speed,
   heading:airborne?(state.heading+state.angularOffset)>>>0:state.heading,
   airborne};
}
