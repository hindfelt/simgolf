import {originalLaunchPreparation} from './original-launch-preparation.js';
import {originalLaunchTail} from './original-launch-tail.js';
// 0x423b66–0x425ab9 for an already-selected target (planner argument != -1).
// All terrain stages consult one map revision. Earlier target/range selection
// remains the caller's responsibility; this does not implement automatic search.
export function originalAssessedLaunch(q,cache,map) {
 if(!Number.isInteger(q.plannerArgument)||q.plannerArgument===-1)throw Error('Assessed launch requires a resolved planner argument.');
 const prepared=originalLaunchPreparation(q,cache,map);
 const launch=originalLaunchTail({...q,...prepared,lie:prepared.terrainCode,
  tileFlags:map.marksAt(q.x>>10,q.z>>10),mode:q.driftMode,targetArgument:Number(q.explicitTarget)},map.shotClassAt);
 return {speed:launch.speed,verticalSpeed:launch.verticalSpeed,heading:launch.heading,
  angularOffset:launch.angularOffset,actorFlags:launch.actorFlags,seed:launch.seed,
  lie:launch.lie,shotType:launch.shotType,club:prepared.club,cache:prepared.cache,
  assessment:prepared.assessment,distance:prepared.distance};
}
