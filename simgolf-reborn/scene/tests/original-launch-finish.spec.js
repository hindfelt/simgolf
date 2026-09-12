import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchFinish} from '../src/simulation/original-launch-finish.js';
const base={speed:3000,verticalSpeed:800,heading:0,angularOffset:1000,actorFlags:0,lie:1,curveOffset:0,
 baseSpeed:3000,modifier:0,club:13,variant:0,stateFlags:0,tileFlags:0,skillMask:0,shotClass:0,mode:0,seed:2002};
test('final lie dispatch and normalization match original executable fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-finish.json',import.meta.url),'utf8'));
 for(const [q,e] of rows){const {draws,...actual}=originalLaunchFinish(q);expect(actual).toEqual(e);}
});
test('putter on green zeros vertical launch while another club keeps its lift',()=>{
 expect(originalLaunchFinish(base).verticalSpeed).toBe(0);
 expect(originalLaunchFinish({...base,club:4}).verticalSpeed).toBe(800);
});
test('design modes restore base speed without skipping original random consumption',()=>{
 for(const mode of [2,3]){
  const result=originalLaunchFinish({...base,mode});expect(result.speed).toBe(3000);expect(result.draws).toBe(1);expect(result.seed).not.toBe(base.seed);
 }
});
test('final modifier can restore reference speed, clamps curvature and clears actor flag one',()=>{
 const result=originalLaunchFinish({...base,modifier:16,angularOffset:0x7fffffff,actorFlags:3});
 expect(result.speed).toBe(3000);expect(result.angularOffset).toBe(0x15555555);expect(result.actorFlags).toBe(2);
});
test('lie minus one bypasses random speed variation',()=>{
 const result=originalLaunchFinish({...base,lie:-1});expect(result.draws).toBe(0);expect(result.seed).toBe(base.seed);
});
