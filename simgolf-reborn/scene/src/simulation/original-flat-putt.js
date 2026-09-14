import {originalBallPositionStep} from './original-ball-position.js';
import {originalGroundResponse,originalBallStopped} from './original-ground-motion.js';
import {originalGroundPhase} from './original-ground-phase.js';

// Integration component for a flat, uninterrupted green. The caller supplies
// an already-prepared launch: no cold-cache substitute or invented RNG draws.
// This is not the full live update: hazards, banks and obstacles must be wired
// before using it for arbitrary courses. Tick-to-wall-clock timing is external.
export function originalFlatPuttStart(launch,{cupX,cupZ,eventFlag=false,rollCoefficient=3}) {
 if(launch.height!==0||launch.verticalSpeed!==0||launch.club!==13)
  throw Error('Flat putt requires a grounded putter launch.');
 if(![cupX,cupZ].every(n=>Number.isInteger(n)&&n>=0&&n<50)||typeof eventFlag!=='boolean'||
   !Number.isInteger(rollCoefficient)||rollCoefficient<0||rollCoefficient>4)
  throw Error('Unsupported flat-green configuration.');
 const ball={x:launch.x,z:launch.z,height:0,speed:launch.speed,verticalSpeed:0,
  heading:launch.heading,angularOffset:launch.angularOffset,seed:launch.seed};
 // Validate via the actual recovered arithmetic, without retaining its result.
 originalBallPositionStep(ball);
 originalGroundResponse({...ball,terrainCode:1,originTerrainCode:1,rollCoefficient,
  forwardSlope:0,crossSlope:0,boundaryFlags:0,phaseCounter:0});
 if(originalBallStopped(ball)) ball.speed=0;
 return {version:1,ball,cupX,cupZ,eventFlag,rollCoefficient,steps:0,status:originalBallStopped(ball)?'stopped':'rolling'};
}

// Phase and RNG belong to the shared simulation, never to an individual shot.
// Feed rngState back to that simulation before stepping another ball.
export function originalFlatPuttStep(state,{phaseCounter,seed}) {
 if(state.version!==1||!['rolling','captured','stopped'].includes(state.status)||
   !Number.isSafeInteger(state.steps)||state.steps<0)throw Error('Invalid flat putt state.');
 if(![phaseCounter,seed].every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff))
  throw Error('Flat putt needs the shared unsigned phase counter and RNG state.');
 if(state.status!=='rolling')return {state:structuredClone(state),rngState:seed,draws:0};
 const before=state.ball,position=originalBallPositionStep(before);
 const response=originalGroundPhase({before,ball:{...before,...position},originTerrainCode:1,
  club:13,eventFlag:state.eventFlag,centreFlag:0,phaseCounter,seed},{
  cellAt:(x,z)=>({code:1,rollCoefficient:state.rollCoefficient,edgeFlags:0,
   flags:x===state.cupX&&z===state.cupZ?128:0}),slopeAt:()=>0,
 });
 let ball=response.ball;
 const capture=response.captured;
 const stopped=originalBallStopped(ball);
 // 0x42ca97 clears residual horizontal speed when the stop predicate passes.
 if(stopped)ball.speed=0;
 return {state:{...state,ball,steps:state.steps+1,status:capture?'captured':stopped?'stopped':'rolling'},
  rngState:response.rngState,draws:response.draws};
}
