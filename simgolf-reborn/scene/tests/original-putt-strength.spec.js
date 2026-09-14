import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPuttRange,originalPuttStrength,originalPuttLaunch} from '../src/simulation/original-putt-strength.js';
import {originalBallPositionStep} from '../src/simulation/original-ball-position.js';
import {originalGroundResponse,originalBallStopped} from '../src/simulation/original-ground-motion.js';
import {originalCupCapture} from '../src/simulation/original-cup.js';
test('putt planning, distance allowance and final variation match original instructions',()=>{
 const b=readFileSync(new URL("../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",import.meta.url));
 const bytes=(a,n)=>b.subarray(a-0x400000,a-0x400000+n).toString('hex');
 expect(bytes(0x421870,7)).toBe('0fbe0df16d5700');
 expect(bytes(0x421887,3)).toBe('c1f803');
 expect(bytes(0x421892,3)).toBe('83fe40');
 expect(bytes(0x4219b0,3)).toBe('83ff02');
 expect(bytes(0x424c68,3)).toBe('83c102');
 expect(bytes(0x42573d,10)).toBe('c786f07f570000000000');
});
test('planning uses full-step drag and the original finite halving search',()=>{
 expect(originalPuttRange(64)).toBe(8);
 expect(originalPuttRange(128)).toBe(69); // 16+14+12+10+9+8
 expect([2,5,10,20,40].map(d=>originalPuttStrength(d))).toEqual([136,266,464,874,1704]);
 for(let d=2;d<=45;d++) expect(Math.abs(originalPuttRange(originalPuttStrength(d))-Math.trunc(d*1024/25))).toBeLessThan(16);
 expect(()=>originalPuttRange(100,8)).toThrow(/converge/);
});
test('launch reserves two yards, varies strength with one draw and remains on the ground',()=>{
 const result=originalPuttLaunch({distanceYards:10,seed:1234});
 expect(result.speed).toBe(585);expect(result.verticalSpeed).toBe(0);expect(result.draws).toBe(1);
 expect(()=>originalPuttLaunch({distanceYards:-2,seed:0})).toThrow();
 const planned=originalPuttStrength(12);
 for(const seed of [0,1,1234,0xffffffff]) {
  const r=originalPuttLaunch({distanceYards:10,seed});
  expect(r.speed).toBeGreaterThan(planned+Math.trunc(planned/12)-Math.trunc(planned/8));
  expect(r.speed).toBeLessThanOrEqual(planned+Math.trunc(planned/12));
 }
});
test('planned straight putts roll into the cup through the recovered update sequence',()=>{
 for(const distanceYards of [2,5,10,20]) {
  const launch=originalPuttLaunch({distanceYards,seed:1234});
  let state={x:20992,z:20992+Math.trunc(distanceYards*1024/25),height:0,heading:0,angularOffset:0,
    speed:launch.speed,verticalSpeed:0,seed:launch.rngState};
  let capture=null,phase=0;
  while(!capture&&!originalBallStopped(state)&&phase<200) {
   const position=originalBallPositionStep(state);
   const response=originalGroundResponse({...state,terrainCode:1,originTerrainCode:1,rollCoefficient:3,
    forwardSlope:0,crossSlope:0,boundaryFlags:0,phaseCounter:phase++});
   state={...state,...position,speed:response.speed,heading:response.heading,angularOffset:response.angularOffset,seed:response.rngState};
   capture=originalCupCapture({...state,cellX:20,cellZ:20,terrainCode:1,cellFlags:128,club:13,eventFlag:false});
  }
  expect(capture,`putt of ${distanceYards} yards`).toEqual({x:20992,z:20992,speed:0});
  expect(phase).toBeGreaterThan(0);expect(phase).toBeLessThan(200);
 }
});
