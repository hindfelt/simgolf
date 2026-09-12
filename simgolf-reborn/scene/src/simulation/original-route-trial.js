import {originalRouteCandidate} from './original-route-candidate.js';
import {originalHeading} from './original-heading.js';
// 0x4227db–0x422921: one 21×21 search-grid entry before admission/simulation.
export function originalRouteTrial(q) {
 if(q.scores[1]>99999)return {skip:true};
 const candidate={x:(q.anchor.x+q.offset.x)|0,z:(q.anchor.z+q.offset.z)|0};
 const x=candidate.x<<10,z=candidate.z<<10;
 const sx=Math.imul((x-q.origin.x+512)|0,25)>>10,sz=Math.imul((z-q.origin.z+512)|0,25)>>10;
 const squared=(Math.imul(sx,sx)+Math.imul(sz,sz))|0;
 return {skip:false,candidate,x,z,distance:squared<0?-2147483648:Math.trunc(Math.sqrt(squared)),
  heading:originalHeading(sx,sz),needsAdmission:q.scores[1]===0,
  scores:q.scores[1]===0?Array(6).fill(100000):[...q.scores]};
}

export function originalPreparedRouteCandidate(q,terrainAt) {
 const trial=originalRouteTrial(q);
 if(trial.skip||!trial.needsAdmission)return trial;
 const admission=originalRouteCandidate({candidate:trial.candidate,
  start:{x:q.origin.x>>10,z:q.origin.z>>10},cup:q.cup,previousTarget:q.previousTarget,
  actorFlags:q.actorFlags,range:q.range,shotDistance:trial.distance,cupDistance:q.cupDistance,terrainAt});
 // 0x422abc–0x422af2 clears all six sentinels once admission succeeds.
 return {...trial,scores:admission.eligible?Array(6).fill(0):trial.scores,admission};
}
