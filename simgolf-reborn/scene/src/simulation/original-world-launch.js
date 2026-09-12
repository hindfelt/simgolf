import {serializeOriginalWorld,restoreOriginalWorld,originalWorldMap} from './original-world-state.js';
import {originalMotionStep} from './original-motion-step.js';
import {originalAssessedLaunch} from './original-assessed-launch.js';

// Internal resolved-target launch transaction, not a network command or an AI
// scheduler. The host supplies the actor's verified raw launch/skill fields.
// All publication happens on a clone, so rejected preparation cannot spend RNG
// or alter the shared cache in the caller's world.
export function beginOriginalWorldShot(world,{id,launchInput,motionContext}) {
 const next=restoreOriginalWorld(serializeOriginalWorld(world));
 if(next.shots.some(shot=>shot.id===id))throw Error('This original shot is already active.');
 const map=originalWorldMap(next);
 const input={...launchInput,seed:next.rngState,globalFlags:next.globalFlags,stateFlags:next.globalFlags};
 const launch=originalAssessedLaunch(input,next.strengthCache,map.planning);
 const shot={id,ball:{x:input.x,z:input.z,height:motionContext.initialHeight,
  speed:launch.speed,verticalSpeed:launch.verticalSpeed,heading:launch.heading,
  angularOffset:launch.angularOffset,seed:launch.seed},
  originTerrainCode:map.terrainAt({x:input.x>>10,z:input.z>>10}).code,
  club:launch.club,eventFlag:!!(next.globalFlags&0x200000),centreFlag:0,stateFlags:launch.actorFlags,
  skillEnabled:motionContext.skillEnabled,skillMask:motionContext.skillMask,luck:motionContext.luck,
  targetTile:{...motionContext.targetTile},variant:motionContext.variant};
 next.shots.push(shot);next.strengthCache=structuredClone(launch.cache);next.rngState=launch.seed;next.revision++;
 // Validate the produced state before exposing any part of the transaction.
 return {world:restoreOriginalWorld(serializeOriginalWorld(next)),launch};
}

// Advance one actor in the host's chosen original update order. The host
// advances the shared phase separately, once per world update, not per ball.
export function stepOriginalWorldShot(world,id) {
 const next=restoreOriginalWorld(serializeOriginalWorld(world));
 const index=next.shots.findIndex(shot=>shot.id===id);
 if(index<0)throw Error('Original shot is not active.');
 const shot=next.shots[index];
 const outcome=originalMotionStep({...shot,seed:next.rngState,phaseCounter:next.phaseCounter},originalWorldMap(next).motion);
 next.rngState=outcome.rngState;next.revision++;
 if(outcome.stopped)next.shots.splice(index,1);
 else next.shots[index]={...shot,ball:outcome.ball,stateFlags:outcome.stateFlags,centreFlag:0};
 return {world:restoreOriginalWorld(serializeOriginalWorld(next)),outcome};
}
