import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchBase} from '../src/simulation/original-launch-base.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
import {originalCandidateStart,originalCandidateStep} from '../src/simulation/original-candidate-step.js';
const input={distance:150,range:200,terrainCode:2,explicitTarget:false,mode:0,actorFlags:0};
test('combined club and velocity construction matches sequential original outputs',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-base.json',import.meta.url),'utf8'));
 let cache=originalStrengthCache();
 for(const [q,expected] of rows){
  const {strength,...actual}=originalLaunchBase(q,cache);
  expect(actual).toEqual(expected);expect(strength).toBeGreaterThanOrEqual(0);
  cache=JSON.parse(JSON.stringify(actual.cache));
 }
});
test('base launch composes with candidate flight without mutating shared cache',()=>{
 const cache=originalStrengthCache(),before=JSON.stringify(cache),base=originalLaunchBase(input,cache);
 expect(JSON.stringify(cache)).toBe(before);
 let state=originalCandidateStart({x:26112,z:26112,height:0,speed:base.speed,verticalSpeed:base.verticalSpeed,
  heading:0x20000000,angularOffset:0,flags:0,seed:2002,professional:false,abilityFlags:0,luck:5,skillMask:7});
 const env={terrainAt:()=>({code:2,flags:0,wallFlags:0,rollCoefficient:0,bounceCoefficient:3}),heightAt:()=>0,slopeAt:()=>0,mode:0,variant:0};
 for(let i=0;i<2000&&state.speed!==0;i++)state=originalCandidateStep(state,env);
 expect(state.speed).toBe(0);expect(state.landing).not.toBeNull();expect(state.steps).toBeGreaterThan(1);
});
test('green club selection remains an intermediate launch before putt-specific adjustments',()=>{
 const result=originalLaunchBase({...input,distance:30,terrainCode:1},originalStrengthCache());
 expect(result.club).toBe(13);
 // Original later code zeros vertical velocity for the putt; do not do it early.
 expect(result.verticalSpeed).toBeGreaterThan(0);
});
