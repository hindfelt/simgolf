import {originalExactCandidate} from './original-exact-candidate.js';
import {originalCandidateStep} from './original-candidate-step.js';
// Own one speculative shot independently of the golfer's live record.
// Landing publication and RNG/cache are shared outputs, not restored actor data.
export function originalCandidateTrial(q,cache,map,physical,previousLanding) {
 const {candidate,launch}=originalExactCandidate(q,cache,map,physical);
 return {candidate,launch,landing:previousLanding?{...previousLanding}:null,
  status:candidate.speed===0?'complete':'running'};
}
// A finite work slice permits yielding or saving without inventing a landing
// when a trajectory has not stopped. Repeated calls continue the same shot.
export function advanceOriginalCandidateTrial(trial,environment,stepBudget) {
 if(!Number.isSafeInteger(stepBudget)||stepBudget<0)throw Error('Invalid candidate work budget.');
 let candidate=trial.candidate;
 for(let i=0;i<stepBudget&&candidate.speed!==0;i++)candidate=originalCandidateStep(candidate,environment);
 return {...trial,candidate,landing:candidate.landing?{...candidate.landing}:trial.landing,
  status:candidate.speed===0?'complete':'running'};
}
