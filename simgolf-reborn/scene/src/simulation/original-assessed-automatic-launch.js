import {originalLaunchPreparation} from './original-launch-preparation.js';
import {originalAutoPreparedLaunch} from './original-auto-prepared-launch.js';
// From an already selected target/range through automatic launch restoration.
// Planning settings are separate from current actor/shared state; the latter
// supplies mutable fields so stale planning copies cannot replace them.
export function originalAssessedAutomaticLaunch(q,map,effects) {
 const actor=q.state.actor;
 const planning={...q.planning,actorId:q.actorId,seed:q.state.seed,
  target:actor.target,actorFlags:actor.actorFlags,actorClass:actor.actorClass,
  skillMask:actor.skillMask,shotCounter:actor.shotCounter};
 if(planning.plannerArgument!==-1)throw Error('Automatic launch requires the original automatic planner sentinel.');
 const prepared=originalLaunchPreparation(planning,q.state.cache,map);
 const origin={x:planning.x>>10,z:planning.z>>10};
 const result=originalAutoPreparedLaunch({...q,origin,heading:planning.heading,
  originFlags:map.marksAt(origin.x,origin.z),mode:Number(planning.explicitTarget),
  driftMode:planning.driftMode,activeActor:planning.activeActor,conditionLevel:planning.level,
  variant:planning.variant,stateFlags:planning.globalFlags},prepared,map,effects);
 const {randomDraws,...rest}=result;
 // This instrumentation counts the automatic middle/tail only. The final
 // seed, however, includes preparation and every later stage's random draws.
 return {...rest,postPreparationDraws:randomDraws};
}
