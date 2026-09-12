import {originalBallPositionStep} from './original-ball-position.js';
import {originalGroundResponse,originalBallStopped} from './original-ground-motion.js';
import {originalCupCapture} from './original-cup.js';

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
 const response=originalGroundResponse({...before,terrainCode:1,originTerrainCode:1,
  rollCoefficient:state.rollCoefficient,forwardSlope:0,crossSlope:0,boundaryFlags:0,phaseCounter,seed});
 let ball={...before,...position,speed:response.speed,heading:response.heading,
  angularOffset:response.angularOffset,seed:response.rngState};
 // This composition samples the cell before movement. The full executable
 // caller still needs an oracle check at tile crossings before live adoption.
 // The cup flag is present only on the actual cup tile.
 const cellX=before.x>>10,cellZ=before.z>>10;
 const capture=originalCupCapture({...ball,cellX,cellZ,terrainCode:1,
  cellFlags:cellX===state.cupX&&cellZ===state.cupZ?128:0,club:13,eventFlag:state.eventFlag});
 if(capture)ball={...ball,...capture};
 return {state:{...state,ball,steps:state.steps+1,status:capture?'captured':originalBallStopped(ball)?'stopped':'rolling'},
  rngState:response.rngState,draws:response.draws};
}
