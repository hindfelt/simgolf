import {originalBallPositionStep} from './original-ball-position.js';
import {originalMotionSample} from './original-motion-sample.js';
import {originalGroundPhase} from './original-ground-phase.js';
import {originalAirPhase} from './original-air-phase.js';
import {originalGravityStep,originalBounce} from './original-bounce.js';
import {originalImpactResponse} from './original-impact-response.js';
import {originalLandingDeflection} from './original-landing-deflection.js';
import {originalBallStopped} from './original-ground-motion.js';

// One recovered motion update. Call only for an active shot. The host owns
// scheduling, launch preparation, RNG handoff, scoring and emitted effects.
// world uses original coordinate/cell metadata and exact slope/height helpers.
export function originalMotionStep(q,world) {
 // 0x4281a5 clears this per-actor scratch flag before every motion update.
 const before=q.ball,cellX=before.x>>10,cellZ=before.z>>10;
 const cell=world.cellAt(cellX,cellZ),previousTerrainHeight=world.heightAt(before.x,before.z);
 let ball={...before,...originalBallPositionStep(before)};
 ball.verticalSpeed=originalGravityStep(ball);
 const sample=originalMotionSample({...ball,cellX,cellZ,terrainCode:cell.code},world.neighborTerrainAt??((x,z)=>world.cellAt(x,z).code));
 let rngState=q.seed,draws=0,stateFlags=q.stateFlags,centreFlag=0;
 const sounds=[];let captured=false,reflectedX=false,reflectedZ=false,landed=false,terrainStopped=false,luckAdjusted=false;
 if(ball.height<=1) {
  const phase=originalGroundPhase({...q,before,ball,centreFlag:0},world);
  ({ball,centreFlag,rngState,draws,captured,reflectedX,reflectedZ}=phase);
  if(reflectedX)sounds.push(6);
  if(reflectedZ)sounds.push(6);
  if(captured)return {ball,centreFlag,rngState,draws,stateFlags:(stateFlags&~0x40000)>>>0,
   cupEntry:phase.cupEntry,captured:true,stopped:true,landed:false,terrainStopped:false,luckAdjusted:false,sounds,reflectedX,reflectedZ,nearbyGolferCheck:null};
 } else {
  const phase=originalAirPhase({...q,ball,cellX,cellZ,terrainCode:cell.code,terrainFlags:cell.flags,
   previousTerrainHeight,terrainHeight:world.heightAt(ball.x,ball.z)});
  ({ball,rngState,draws,stateFlags}=phase);
  if(phase.sound!==null)sounds.push(phase.sound);
 }
 const bounce=originalBounce({...ball,bounceCoefficient:cell.bounceCoefficient,boundaryFlags:sample.boundaryFlags});
 ball={...ball,height:bounce.height,verticalSpeed:bounce.verticalSpeed};landed=bounce.landed;
 if(landed) {
  if(bounce.impactEffect)sounds.push(cell.code===7?55:54);
  const impact=originalImpactResponse({...ball,stateFlags,direction:sample.direction,scatterCoefficient:cell.scatterCoefficient,
   currentTerrainCode:world.cellAt(ball.x>>10,ball.z>>10).code,boundaryFlags:sample.boundaryFlags,seed:rngState},d=>world.slopeAt(ball.x,ball.z,d));
  ball={...ball,speed:impact.speed,heading:impact.heading,verticalSpeed:impact.verticalSpeed};
  stateFlags=impact.stateFlags;rngState=impact.rngState;draws+=impact.draws;terrainStopped=impact.stoppedByTerrain;
  const deflection=originalLandingDeflection({...q,...ball,terrainCode:cell.code,boundaryFlags:sample.boundaryFlags,
   scatterCoefficient:cell.scatterCoefficient,seed:rngState});
  ball.heading=deflection.heading;rngState=deflection.rngState;draws+=deflection.draws;
  sounds.push(...deflection.sounds);luckAdjusted=deflection.luckAdjusted;
 }
 ball.seed=rngState;
 const nearbyGolferCheck=landed&&ball.verticalSpeed>200?{x:ball.x,z:ball.z}:null;
 const stopped=originalBallStopped(ball);if(stopped)ball.speed=0;
 return {ball,centreFlag,rngState,draws,stateFlags,captured:false,stopped,landed,terrainStopped,luckAdjusted,
  sounds,reflectedX,reflectedZ,nearbyGolferCheck};
}
