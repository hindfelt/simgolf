import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCandidateTrial,advanceOriginalCandidateTrial} from '../src/simulation/original-candidate-trial.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
import {originalShotMap} from '../src/simulation/original-shot-map.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-contiguous-candidate.json',import.meta.url),'utf8'));
const sharedMap=q=>originalShotMap({terrain:Uint8Array.from(q.terrain),marks:Uint16Array.from(q.marks),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)},readHeight:()=>0,globalFlags:0,metadata:code=>({flags:0,kind:q.kinds[code],shotClass:q.classes[code+1],bounceCoefficient:3,rollCoefficient:0})});
test('sliced trials match uninterrupted original candidate calls and preserve caller state',()=>{
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
  expect({cache:trial.launch.cache,end:{x:a.x,z:a.z,seed:a.seed,steps:a.steps,landing:a.landing}}).toEqual(e);
  expect(trial.landing).toEqual(e.end.landing??previous);
  cache=trial.launch.cache;
 }
});
