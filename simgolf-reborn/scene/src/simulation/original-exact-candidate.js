import {originalExactPlanner} from './original-exact-planner.js';
import {originalCandidateStart} from './original-candidate-step.js';
// Exact-coordinate candidate launch, before the resumable flight loop.
// Physical fields use the candidate skill mask, independently of actor skills.
export function originalExactCandidate(q,cache,map,physical) {
 const launch=originalExactPlanner(q,cache,map);
 const candidate=originalCandidateStart({...physical,x:q.x,z:q.z,height:0,
  speed:launch.speed,verticalSpeed:launch.verticalSpeed,heading:launch.heading,
  angularOffset:launch.angularOffset,flags:launch.actorFlags,seed:launch.seed});
 return {candidate,launch};
}
