import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCandidateStart,originalCandidateStep} from '../src/simulation/original-candidate-step.js';
const {world,rows}=JSON.parse(readFileSync(new URL('./fixtures/original-candidate-mixed.json',import.meta.url),'utf8'));
const environment=(mode,variant)=>({terrainAt:p=>{const i=p.x*50+p.z,code=world.grid[i];return {code,flags:world.marks[i],wallFlags:world.walls[i],...world.metadata[code]};},heightAt:()=>0,slopeAt:()=>0,mode,variant});
function finish(a,env){for(let i=0;i<2000&&a.speed!==0;i++)a=originalCandidateStep(a,env);expect(a.speed).toBe(0);return a;}
test('mixed-surface trajectories match original landing, terminal position and RNG',()=>{
 for(const [launch,mode,variant,expected] of rows){
  const actual=finish(originalCandidateStart(launch),environment(mode,variant));
  expect({x:actual.x,z:actual.z,seed:actual.seed,steps:actual.steps,landing:actual.landing}).toEqual(expected);
 }
});
test('zero horizontal speed does not fabricate a settled landing',()=>{
 const row=rows.find(([, , ,e])=>e.landing===null);expect(row).toBeTruthy();
 const [launch,mode,variant]=row;
 const result=finish(originalCandidateStart(launch),environment(mode,variant));
 expect(result.speed).toBe(0);expect(result.verticalSpeed!==0||result.height!==0).toBe(true);
 expect(result.landing).toBeNull();
});
test('mixed-surface candidate state resumes without changing original outcome',()=>{
 for(const [launch,mode,variant] of rows.slice(0,5)){
  const env=environment(mode,variant),start=originalCandidateStart(launch);
  let partial=start;for(let i=0;i<5&&partial.speed!==0;i++)partial=originalCandidateStep(partial,env);
  expect(finish(JSON.parse(JSON.stringify(partial)),env)).toEqual(finish(start,env));
 }
});
