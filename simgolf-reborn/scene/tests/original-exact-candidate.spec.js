import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalExactCandidate} from '../src/simulation/original-exact-candidate.js';
import {originalCandidateStep} from '../src/simulation/original-candidate-step.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const {world,rows}=JSON.parse(readFileSync(new URL('./fixtures/original-exact-candidate.json',import.meta.url),'utf8'));
const terrain=q=>({terrainAt:(x,z)=>q.terrain[x*50+z],kindAt:c=>q.kinds[c],shotClassAt:lie=>q.classes[lie+1],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});
const environment=q=>({terrainAt:p=>{const i=p.x*50+p.z,code=world.grid[i];return {code,flags:world.marks[i],wallFlags:world.walls[i],...world.metadata[code]};},heightAt:()=>0,slopeAt:()=>0,mode:q.driftMode,variant:q.variant});
function finish(a,env){for(let i=0;i<2000&&a.speed!==0;i++)a=originalCandidateStep(a,env);expect(a.speed).toBe(0);return a;}
test('exact planner through full candidate simulation matches chained original results',()=>{
 let cache=originalStrengthCache();
 for(const [q,physical,e] of rows){
  const result=originalExactCandidate(q,cache,terrain(q),physical);cache=result.launch.cache;
  const a=finish(result.candidate,environment(q));
  expect({launch:result.launch,end:{x:a.x,z:a.z,seed:a.seed,steps:a.steps,landing:a.landing}}).toEqual(e);
 }
});
test('complete launch can resume midflight with serialized candidate and shared cache',()=>{
 let cache=originalStrengthCache();
 for(const [q,physical] of rows.slice(0,12)){
  const result=originalExactCandidate(q,cache,terrain(q),physical),env=environment(q);cache=result.launch.cache;
  let a=result.candidate;for(let i=0;i<5&&a.speed!==0;i++)a=originalCandidateStep(a,env);
  const saved=JSON.parse(JSON.stringify({candidate:a,cache}));
  expect(finish(saved.candidate,env)).toEqual(finish(result.candidate,env));expect(saved.cache).toEqual(cache);
 }
});
