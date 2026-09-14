import {originalDirectionalHeightStage} from '../src/simulation/original-corner-height.js';
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCandidateTrial,advanceOriginalCandidateTrial,originalCandidateTrialResult} from '../src/simulation/original-candidate-trial.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
import {originalShotMap} from '../src/simulation/original-shot-map.js';
for(const variant of ['','nonflat-']){
const rows=JSON.parse(readFileSync(new URL(`./fixtures/original-contiguous-${variant}candidate.json`,import.meta.url),'utf8'));
const sharedMap=q=>{const readHeight=(r,c)=>q.vertices[r*51+c];return originalShotMap({terrain:Uint8Array.from(q.terrain),marks:Uint16Array.from(q.marks),derived:{...originalDirectionalHeightStage({readHeight,readMetadataFlags:()=>0}),edgeMasks:new Uint8Array(2500)},readHeight,globalFlags:0,metadata:code=>({flags:0,kind:q.kinds[code],shotClass:q.classes[code+1],bounceCoefficient:3,rollCoefficient:0})});};
test(`${variant||'flat-'}sliced trials match uninterrupted original candidate calls and preserve caller state`,()=>{
 let cache=originalStrengthCache();
 for(const [q,e] of rows){
  const physical={professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5,skillMask:q.skillMask},map=sharedMap(q);
  const previous={x:123,z:456},before=JSON.stringify({q,physical,cache,previous});
  let trial=originalCandidateTrial(q,cache,map.planning,physical,previous);
  expect(JSON.stringify({q,physical,cache,previous})).toBe(before);
  const initial=JSON.stringify(trial),env={...map,mode:q.driftMode,variant:q.variant};
  const untouched=advanceOriginalCandidateTrial(trial,env,0);
  expect(JSON.stringify(untouched)).toBe(initial);
  let slices=0;
  while(trial.status==='running'&&slices++<300){
   const prior=trial,serialized=JSON.stringify(prior);
   trial=advanceOriginalCandidateTrial(JSON.parse(serialized),env,7);
   expect(JSON.stringify(prior)).toBe(serialized);
   if(trial.status==='running')expect(trial.landing).toEqual(previous);
  }
  expect(trial.status).toBe('complete');
  const a=trial.candidate;
  const shared=originalCandidateTrialResult(trial);
  expect(shared.seed).toBe(e.end.seed);expect(shared.landing).toEqual(e.end.landing??previous);
  expect({shotClassOverrides:shared.shotClassOverrides,cache:shared.cache,end:{x:a.x,z:a.z,seed:a.seed,steps:a.steps,landing:a.landing}}).toEqual(e);
  expect(trial.landing).toEqual(e.end.landing??previous);
  cache=trial.launch.cache;
 }
});

}

test('completion publication rejects pending trials and owns its output snapshot',()=>{
 expect(()=>originalCandidateTrialResult({status:'running',candidate:{speed:1}})).toThrow('has not completed');
 const trial={status:'complete',candidate:{speed:0,seed:10},landing:{x:12,z:34},launch:{cache:originalStrengthCache()}};
 const first=originalCandidateTrialResult(trial);
 first.landing.x=99;first.cache.entries[0].speed=999;first.shotClassOverrides[0].shotClass=32;
 const second=originalCandidateTrialResult(trial);
 expect(second.landing).toEqual({x:12,z:34});expect(second.cache.entries[0].speed).toBe(0);
 expect(second.shotClassOverrides).toEqual([{code:17,shotClass:8},{code:20,shotClass:8}]);
});
