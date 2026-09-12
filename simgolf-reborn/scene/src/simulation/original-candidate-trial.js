import {originalExactCandidate} from './original-exact-candidate.js';
import {originalCandidateStep} from './original-candidate-step.js';
import {originalPlannerRestoration} from './original-planner-restoration.js';
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

// Publish only once the speculative shot has finished. The planner epilogue
// (0x425ab9–0x425aca) sets classes 17 and 20 to 8, outside the actor snapshot.
export function originalCandidateTrialResult(trial) {
 if(trial.status!=='complete'||trial.candidate.speed!==0)
  throw Error('Candidate trial has not completed.');
 return {landing:trial.landing?{...trial.landing}:null,seed:trial.candidate.seed,
  cache:{next:trial.launch.cache.next,entries:trial.launch.cache.entries.map(e=>({...e}))},
  shotClassOverrides:originalPlannerRestoration()};
}

// Start the next speculative shot from shared results, not stale actor RNG or
// terrain metadata. Keep the map itself unchanged for deterministic replay.
export function originalSharedCandidateTrial(q,shared,map,physical) {
 const classes=new Map(shared.shotClassOverrides.map(p=>[p.code,p.shotClass]));
 const planning={...map,shotClassAt:code=>classes.has(code)?classes.get(code):map.shotClassAt(code)};
 return originalCandidateTrial({...q,seed:shared.seed},shared.cache,planning,physical,shared.landing);
}
