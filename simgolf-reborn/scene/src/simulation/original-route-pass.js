import {originalPreparedRouteCandidate} from './original-route-trial.js';
import {originalRouteOptions} from './original-route-options.js';
// 0x4227b1–0x423261: one complete 441-tile pass, before pruning/repetition.
export function originalRoutePass(q,simulate) {
 const scores=q.scores.map(r=>[...r]),distances=q.distances.map(r=>[...r]),flags=q.flags.map(r=>[...r]);
 let work=q.work,winner=structuredClone(q.winner),searchFlag=q.searchFlag,followupFlag=q.followupFlag;
 for(let x=-10;x<=10;x++)for(let z=-10;z<=10;z++){
  const i=(x+10)*21+z+10;
  const trial=originalPreparedRouteCandidate({...q,offset:{x,z},scores:scores[i]},q.terrainAt);
  if(trial.skip)continue;
  scores[i]=trial.scores;
  if(trial.needsAdmission&&!trial.admission.eligible)continue;
  const result=originalRouteOptions({...q,target:trial.candidate,distance:trial.distance,heading:trial.heading,
   scores:scores[i],distances:distances[i],flags:flags[i],work,winner,searchFlag,followupFlag},simulate);
  scores[i]=result.scores;distances[i]=result.distances;flags[i]=result.flags;
  ({work,winner,searchFlag,followupFlag}=result);
 }
 return {scores,distances,flags,work,winner,searchFlag,followupFlag};
}
