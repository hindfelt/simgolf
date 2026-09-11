import {originalAutoLaunchMiddle} from './original-auto-launch-middle.js';
import {originalLaunchTail} from './original-launch-tail.js';
// Automatic launch from the selected-club boundary through final velocity
// normalization (0x424988–0x425ab9). Planner entry/target selection and the
// metadata-restoration epilogue remain outside this function.
export function originalAutoLaunchFinish(q,map,effects) {
 const middle=originalAutoLaunchMiddle(q,map,effects),state=middle.state,actor=state.actor;
 const launch=originalLaunchTail({...q,speed:state.speed,verticalSpeed:state.verticalSpeed,
  heading:state.heading,angularOffset:actor.angularOffset,actorFlags:actor.actorFlags,
  skillMask:actor.skillMask,actorClass:actor.actorClass,club:actor.club,
  shotType:actor.stateCode,shotCounter:actor.shotCounter,recoveryValue:actor.recoveryValue,
  seed:state.seed,strength:q.distance,lie:q.terrainCode,level:q.conditionLevel,
  mode:q.driftMode,targetArgument:q.mode,curve:q.curveArgument,tileFlags:q.originFlags},map.shotClassAt);
 return {...middle,randomDraws:middle.randomDraws+launch.draws,
  state:{...state,speed:launch.speed,verticalSpeed:launch.verticalSpeed,heading:launch.heading,
   seed:launch.seed,lie:launch.lie,actor:{...actor,angularOffset:launch.angularOffset,
    actorFlags:launch.actorFlags,stateCode:launch.shotType}}};
}
