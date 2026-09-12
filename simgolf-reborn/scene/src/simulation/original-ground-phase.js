import {originalMotionSample} from './original-motion-sample.js';
import {originalGroundResponse} from './original-ground-motion.js';
import {originalGroundContact,originalGroundReflection} from './original-ground-contact.js';
import {originalCupCapture} from './original-cup.js';

// Live ground phase after position/gravity, through contact/cup/reflection.
// The caller still owns bounce, hazard/obstacle effects, stop and scoring.
// world exposes ORIGINAL units/terrain metadata, not browser gradient proxies.
export function originalGroundPhase({before,ball,originTerrainCode,club,eventFlag,centreFlag,phaseCounter,seed},world) {
 if(!Number.isInteger(ball.height)||ball.height>1)throw Error('Original ground phase requires contact height.');
 if(typeof world?.cellAt!=='function'||typeof world?.slopeAt!=='function')throw Error('Original terrain adapter required.');
 const cellX=before.x>>10,cellZ=before.z>>10;
 const cell=world.cellAt(cellX,cellZ),terrainAt=(x,z)=>world.cellAt(x,z).code;
 const sample=originalMotionSample({...ball,cellX,cellZ,terrainCode:cell.code},terrainAt);
 const response=originalGroundResponse({...ball,terrainCode:cell.code,originTerrainCode,
  rollCoefficient:cell.rollCoefficient,forwardSlope:world.slopeAt(ball.x,ball.z,sample.direction),
  crossSlope:world.slopeAt(ball.x,ball.z,(sample.direction+2)&7),
  boundaryFlags:sample.boundaryFlags,phaseCounter,seed});
 const contact=originalGroundContact({speed:response.speed,terrainCode:cell.code,
  ...sample,cellX,cellZ,centreFlag},terrainAt);
 let next={...ball,speed:contact.speed,heading:response.heading,angularOffset:response.angularOffset,seed:response.rngState};
 const capture=originalCupCapture({...next,cellX,cellZ,terrainCode:cell.code,cellFlags:cell.flags,club,eventFlag});
 let reflectedX=false,reflectedZ=false;
 if(capture)next={...next,...capture};
 else {
  const reflection=originalGroundReflection({...next,cellX,cellZ,edgeFlags:cell.edgeFlags,
   stepX:(ball.x-before.x)|0,stepCosine:(before.z-ball.z)|0});
  next.heading=reflection.heading;({reflectedX,reflectedZ}=reflection);
 }
 return {ball:next,captured:!!capture,centreFlag:contact.centreFlag,boundaryFlags:sample.boundaryFlags,
  reflectedX,reflectedZ,rngState:response.rngState,draws:response.draws};
}
