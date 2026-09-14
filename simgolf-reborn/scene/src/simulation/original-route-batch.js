import {originalRouteSample} from './original-route-sample.js';
import {originalRouteScoredLanding} from './original-route-scored-landing.js';
import {originalRouteBest} from './original-route-best.js';
// 0x422bb5–0x42313e for one eligible option. Simulation and assessment callbacks
// own their RNG state and are called sequentially, never in parallel.
export function originalRouteBatch(q,simulate) {
 if(![2,4,8].includes(q.samples))throw Error('Invalid original route batch size.');
 let work=q.work,score=0,goodLandings=0,followupFlag=q.followupFlag,review,landing;
 for(let i=0;i<q.samples;i++){
  const trial=originalRouteSample({...q,work},simulate);work=trial.work;landing=trial.result.landing;
  review=originalRouteScoredLanding({...q,landing,score,goodLandings,followupFlag});
  ({score,goodLandings,followupFlag}=review);
 }
 const best=originalRouteBest({...q,sampleScore:score,goodLandings,landing,sampleFlags:review.sampleFlags});
 return {...best,work,sampleScore:score,goodLandings,followupFlag,plannedRemaining:review.plannedRemaining,sampleFlags:review.sampleFlags};
}
