import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCupCapture} from '../src/simulation/original-cup.js';
import {originalBallPositionStep} from '../src/simulation/original-ball-position.js';
import {originalGroundResponse,originalBallStopped} from '../src/simulation/original-ground-motion.js';
const base={x:512,z:512,cellX:0,cellZ:0,terrainCode:1,cellFlags:128,speed:100,club:13,eventFlag:false};
test('cup speed, presence flag and club-dependent divisor match original bytes',()=>{
 const b=readFileSync(new URL("../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",import.meta.url));
 const bytes=(a,n)=>b.subarray(a-0x400000,a-0x400000+n).toString('hex');
 expect(bytes(0x42c36d,8)).toBe('f6044500ba530080');
 expect(bytes(0x42c37b,10)).toBe('81bdec7f570040010000');
 expect(bytes(0x42c3be,3)).toBe('80eb0d');
 expect(bytes(0x42c3c7,5)).toBe('b800040000');
 expect(bytes(0x42c3e3,6)).toBe('83e30a83c314');
});
test('strict capture radii distinguish putts, other shots and the event flag',()=>{
 for(const [club,eventFlag,radius] of [[13,false,51],[13,true,34],[3,false,17],[3,true,11]]) {
  expect(originalCupCapture({...base,club,eventFlag,x:512+radius-1})).toEqual({x:512,z:512,speed:0});
  expect(originalCupCapture({...base,club,eventFlag,x:512+radius})).toBeNull();
 }
 expect(originalCupCapture({...base,x:548,z:548})).not.toBeNull(); // trunc(sqrt(2592))=50
 expect(originalCupCapture({...base,x:549,z:549})).toBeNull();
});
test('speed and terrain eligibility cannot be bypassed by proximity',()=>{
 expect(originalCupCapture({...base,speed:319})).not.toBeNull();
 for(const patch of [{speed:320},{speed:321},{cellFlags:0},{cellX:-1},{cellX:50},{cellZ:50},{terrainCode:20}])
  expect(originalCupCapture({...base,...patch})).toBeNull();
 expect(originalCupCapture({...base,cellFlags:0x180})).not.toBeNull();
});
test('capture snaps to the supplied tile centre without changing scoring state',()=>{
 const sample={...base,cellX:12,cellZ:21,x:12*1024+520,z:21*1024+500};
 const before=structuredClone(sample);
 expect(originalCupCapture(sample)).toEqual({x:12*1024+512,z:21*1024+512,speed:0});
 expect(sample).toEqual(before);
});
test('recovered position and ground response can feed a cup capture after rolling',()=>{
 let state={x:512,z:600,height:0,speed:192,verticalSpeed:0,heading:0,angularOffset:0,seed:0};
 let capture=null,phase=0;
 while(!capture&&!originalBallStopped(state)&&phase<100) {
  const position=originalBallPositionStep(state);
  const response=originalGroundResponse({...state,terrainCode:1,originTerrainCode:1,rollCoefficient:3,
   forwardSlope:0,crossSlope:0,boundaryFlags:0,phaseCounter:phase++,seed:state.seed});
  state={...state,...position,speed:response.speed,heading:response.heading,angularOffset:response.angularOffset,seed:response.rngState};
  capture=originalCupCapture({...base,...state});
 }
 expect(phase).toBeGreaterThan(1);expect(phase).toBeLessThan(100);
 expect(capture).toEqual({x:512,z:512,speed:0});
});
