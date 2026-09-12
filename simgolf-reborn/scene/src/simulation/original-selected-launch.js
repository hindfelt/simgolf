import {originalLaunchTerrain} from './original-launch-terrain.js';
import {originalShotClub} from './original-shot-club.js';
import {originalLaunchTail} from './original-launch-tail.js';
// Original already-selected target path from 0x423f48 to final launch state.
// Third planner argument -1 enters additional search/side effects, not this path.
export function originalSelectedLaunch(q,cache,terrain) {
 if(!Number.isInteger(q.plannerArgument)||q.plannerArgument===-1)throw Error('Selected launch requires a resolved planner argument.');
 const prepared=originalLaunchTerrain(q,cache,terrain.kindAt);
 const result=originalLaunchTail({...q,...prepared,strength:originalShotClub(q).strength,
  lie:q.terrainCode,mode:q.driftMode,targetArgument:Number(q.explicitTarget)},terrain.shotClassAt);
 return {speed:result.speed,verticalSpeed:result.verticalSpeed,heading:result.heading,angularOffset:result.angularOffset,
  actorFlags:result.actorFlags,seed:result.seed,lie:result.lie,shotType:result.shotType,club:prepared.club,cache:prepared.cache};
}
