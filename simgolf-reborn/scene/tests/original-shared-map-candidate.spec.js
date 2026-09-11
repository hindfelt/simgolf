import {originalDirectionalHeightStage} from '../src/simulation/original-corner-height.js';
import {originalShotMap} from '../src/simulation/original-shot-map.js';
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalExactCandidate} from '../src/simulation/original-exact-candidate.js';
import {originalCandidateStep} from '../src/simulation/original-candidate-step.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
for(const variant of ['','nonflat-']){
const {rows,heights}=JSON.parse(readFileSync(new URL(`./fixtures/original-shared-map-${variant}candidate.json`,import.meta.url),'utf8'));
const readHeight=(x,z)=>heights[x*51+z];
const sharedMap=q=>originalShotMap({terrain:Uint8Array.from(q.terrain),marks:Uint16Array.from(q.marks),derived:{...originalDirectionalHeightStage({readHeight,readMetadataFlags:()=>0}),edgeMasks:new Uint8Array(2500)},readHeight,globalFlags:0,metadata:code=>({flags:0,kind:q.kinds[code],shotClass:q.classes[code+1],bounceCoefficient:3,rollCoefficient:0})});
function finish(a,env){for(let i=0;i<2000&&a.speed!==0;i++)a=originalCandidateStep(a,env);expect(a.speed).toBe(0);return a;}
test(`${variant||'flat-'}shared map planning and full candidate simulation matches chained original results`,()=>{
 let cache=originalStrengthCache();
 for(const [q,physical,e] of rows){
  const map=sharedMap(q);const result=originalExactCandidate(q,cache,map.planning,physical);cache=result.launch.cache;
  const a=finish(result.candidate,{...map,mode:q.driftMode,variant:q.variant});
  expect({launch:result.launch,end:{x:a.x,z:a.z,seed:a.seed,steps:a.steps,landing:a.landing}}).toEqual(e);
 }
});
test(`${variant||'flat-'}complete launch resumes midflight with serialized candidate and cache`,()=>{
 let cache=originalStrengthCache();
 for(const [q,physical] of rows.slice(0,12)){
  const map=sharedMap(q),result=originalExactCandidate(q,cache,map.planning,physical),env={...map,mode:q.driftMode,variant:q.variant};cache=result.launch.cache;
  let a=result.candidate;for(let i=0;i<5&&a.speed!==0;i++)a=originalCandidateStep(a,env);
  const saved=JSON.parse(JSON.stringify({candidate:a,cache}));
  expect(finish(saved.candidate,env)).toEqual(finish(result.candidate,env));expect(saved.cache).toEqual(cache);
 }
});

}
