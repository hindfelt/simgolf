import {originalRouteLandingScore} from './original-route-landing-score.js';
import {originalRouteSegment} from './original-route-distance.js';
// 0x422c34–0x422ea4: complete landing score plus intended-vs-actual progress flag.
export function originalRouteLandingReview(q) {
 const result=originalRouteLandingScore(q);
 const offset=q.cornerTarget?0:512;
 const plannedRemaining=originalRouteSegment({x:(q.target.x<<10)+offset,z:(q.target.z<<10)+offset},q.cup);
 let sampleFlags=(q.heading&~1)>>>0;
 if(plannedRemaining-result.remaining>25&&plannedRemaining>result.remaining*2)sampleFlags=(sampleFlags|1)>>>0;
 return {...result,plannedRemaining,sampleFlags};
}
