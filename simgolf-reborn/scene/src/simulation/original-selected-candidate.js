import {originalSelectedLaunch} from './original-selected-launch.js';
import {originalCandidateStart} from './original-candidate-step.js';
// Bridge resolved launch into the candidate loop. Physical actor properties
// remain explicit until the original actor-to-browser adapter is established.
export function originalSelectedCandidate(q,cache,terrain,physical) {
 const launch=originalSelectedLaunch(q,cache,terrain);
 const candidate=originalCandidateStart({...physical,x:q.x,z:q.z,height:0,
  speed:launch.speed,verticalSpeed:launch.verticalSpeed,heading:launch.heading,
  angularOffset:launch.angularOffset,flags:launch.actorFlags,seed:launch.seed});
 return {candidate,cache:launch.cache,club:launch.club,shotType:launch.shotType};
}
