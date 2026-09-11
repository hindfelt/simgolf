import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalSharedCandidateTrial,advanceOriginalCandidateTrial,originalCandidateTrialResult} from '../src/simulation/original-candidate-trial.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
import {originalShotMap} from '../src/simulation/original-shot-map.js';
const {initial,rows}=JSON.parse(readFileSync(new URL('./fixtures/original-shared-candidate-trials.json',import.meta.url),'utf8'));
const sharedMap=q=>originalShotMap({terrain:Uint8Array.from(q.terrain),marks:Uint16Array.from(q.marks),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)},readHeight:()=>0,globalFlags:0,metadata:code=>({flags:0,kind:q.kinds[code],shotClass:q.classes[code+1],bounceCoefficient:3,rollCoefficient:0})});
test('sequential trials match original shared state across serialized boundaries',()=>{
 let shared=JSON.parse(JSON.stringify(initial));
 for(const [q,e] of rows){
  const map=sharedMap(q),physical={professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5,skillMask:q.skillMask};
  const before=JSON.stringify({q,shared});
  let trial=originalSharedCandidateTrial(q,shared,map.planning,physical);
  expect(JSON.stringify({q,shared})).toBe(before);
  for(let i=0;i<300&&trial.status==='running';i++)trial=advanceOriginalCandidateTrial(JSON.parse(JSON.stringify(trial)),{...map,mode:q.driftMode,variant:q.variant},7);
  shared=originalCandidateTrialResult(trial);expect(shared).toEqual(e);
  expect(map.planning.shotClassAt(17)).toBe(q.classes[18]);
  shared=JSON.parse(JSON.stringify(shared));
 }
});
