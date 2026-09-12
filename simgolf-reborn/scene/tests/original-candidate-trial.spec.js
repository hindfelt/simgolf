import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCandidateTrial,advanceOriginalCandidateTrial} from '../src/simulation/original-candidate-trial.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const {world,rows}=JSON.parse(readFileSync(new URL('./fixtures/original-exact-candidate.json',import.meta.url),'utf8'));
const terrain=q=>({terrainAt:(x,z)=>q.terrain[x*50+z],kindAt:c=>q.kinds[c],shotClassAt:lie=>q.classes[lie+1],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});
const environment=q=>({terrainAt:p=>{const i=p.x*50+p.z,code=world.grid[i];return {code,flags:world.marks[i],wallFlags:world.walls[i],...world.metadata[code]};},heightAt:()=>0,slopeAt:()=>0,mode:q.driftMode,variant:q.variant});
test('sliced speculative trials preserve original results and caller state',()=>{
 let cache=originalStrengthCache();
 for(const [q,physical,e] of rows){
  const previous={x:123,z:456},before=JSON.stringify({q,physical,cache,previous});
  let trial=originalCandidateTrial(q,cache,terrain(q),physical,previous);
  expect(JSON.stringify({q,physical,cache,previous})).toBe(before);
  const initial=JSON.stringify(trial),env=environment(q);
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
  expect({launch:trial.launch,end:{x:a.x,z:a.z,seed:a.seed,steps:a.steps,landing:a.landing}}).toEqual(e);
  expect(trial.landing).toEqual(e.end.landing??previous);
  cache=trial.launch.cache;
 }
});
test('zero-speed trial retains landing publication and consumes no random state',()=>{
 const trial={candidate:{speed:0,seed:123,landing:null},landing:{x:40,z:50},status:'complete'};
 expect(advanceOriginalCandidateTrial(trial,{},10)).toEqual(trial);
});
test('invalid work budgets fail instead of silently truncating trials',()=>{
 for(const budget of [-1,0.5,NaN,Infinity])expect(()=>advanceOriginalCandidateTrial({}, {},budget)).toThrow('Invalid candidate work budget');
});
