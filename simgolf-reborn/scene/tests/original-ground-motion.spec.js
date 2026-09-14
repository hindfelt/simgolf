import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { originalGroundResponse, originalBallStopped } from '../src/simulation/original-ground-motion.js';
import { originalTerrainMetadata } from '../src/simulation/original-terrain-metadata.js';
const base={speed:1024,heading:0,angularOffset:0,terrainCode:2,originTerrainCode:2,
 rollCoefficient:3,forwardSlope:0,crossSlope:0,boundaryFlags:0,phaseCounter:1,seed:0};

test('ground response and stop boundaries match the supplied executable',()=>{
 const b=readFileSync(new URL("../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",import.meta.url));
 const bytes=(va,n)=>b.subarray(va-0x400000,va-0x400000+n).toString('hex');
 expect(bytes(0x42c15a,3)).toBe('0fbe0f');
 expect(bytes(0x42c1b5,8)).toBe('80bc51380d570001');
 expect(bytes(0x42c1bf,5)).toBe('0fbe3733c0');
 expect(bytes(0x42c1c4,3)).toBe('c1e01a');
 expect(bytes(0x42ca6c,7)).toBe('83bdec7f570040');
 for(let code=0;code<23;code++)
  expect(originalTerrainMetadata(code).rollCoefficient).toBe(b.readInt8(0xc0a38+48*code+33));
});
test('resistance selects the original speed updates on either side of five',()=>{
 const speedAt=rollCoefficient=>originalGroundResponse({...base,rollCoefficient}).speed;
 expect([0,1,2,3,4,5,6].map(speedAt)).toEqual([512,768,896,960,992,1040,1040]);
 expect(originalGroundResponse({...base,speed:2048,rollCoefficient:5}).speed).toBe(2048);
 expect(originalGroundResponse({...base,speed:4096,rollCoefficient:5}).speed).toBe(4064);
 expect(originalGroundResponse({...base,speed:65,rollCoefficient:3}).speed).toBe(61);
});
test('forward slope, clamping and boundary minimum precede the green-origin override',()=>{
 expect(originalGroundResponse({...base,forwardSlope:2}).resistance).toBe(1);
 expect(originalGroundResponse({...base,forwardSlope:2,boundaryFlags:4}).resistance).toBe(2);
 expect(originalGroundResponse({...base,forwardSlope:200}).resistance).toBe(0);
 expect(originalGroundResponse({...base,forwardSlope:-200}).resistance).toBe(99);
 const greenOrigin=originalGroundResponse({...base,originTerrainCode:1,forwardSlope:200,crossSlope:3,boundaryFlags:4});
 expect(greenOrigin.resistance).toBe(3);expect(greenOrigin.speed).toBe(960);expect(greenOrigin.heading).toBe(0);
 // Destination green does not replace the origin-cell check.
 expect(originalGroundResponse({...base,terrainCode:1,forwardSlope:2,crossSlope:1}).resistance).toBe(1);
});
test('cross slope turns before current-green curvature with original 32-bit wrapping',()=>{
 const result=originalGroundResponse({...base,terrainCode:1,crossSlope:1,angularOffset:20});
 expect(result.heading).toBe((0-2**25+10)>>>0);
 expect(originalGroundResponse({...base,crossSlope:-1}).heading).toBe(2**25);
 expect(originalGroundResponse({...base,crossSlope:64}).heading).toBe(0);
 const reversed=originalGroundResponse({...base,terrainCode:1,angularOffset:20,phaseCounter:8});
 expect(reversed.heading).toBe(10);expect(reversed.angularOffset).toBe(-20);expect(reversed.draws).toBe(1);
});
test('ball stops only below 64 with both vertical fields exactly zero',()=>{
 for(const speed of [0,1,63]) expect(originalBallStopped({speed,height:0,verticalSpeed:0})).toBe(true);
 for(const speed of [64,65,1024]) expect(originalBallStopped({speed,height:0,verticalSpeed:0})).toBe(false);
 for(const value of [-1,1]) {
  expect(originalBallStopped({speed:0,height:value,verticalSpeed:0})).toBe(false);
  expect(originalBallStopped({speed:0,height:0,verticalSpeed:value})).toBe(false);
 }
});
test('repeated flat-green ground responses decay to the stopping threshold and resume identically',()=>{
 const update=(state,phaseCounter)=>{
  const result=originalGroundResponse({...base,...state,terrainCode:1,originTerrainCode:1,phaseCounter});
  return {speed:result.speed,heading:result.heading,angularOffset:result.angularOffset,seed:result.rngState};
 };
 let state={speed:1024,heading:0,angularOffset:20,seed:0}, saved;
 let stoppedAt=0;
 while(!originalBallStopped({...state,height:0,verticalSpeed:0}) && stoppedAt<100) {
  state=update(state,stoppedAt++);
  if(stoppedAt===10) saved=JSON.parse(JSON.stringify(state));
 }
 expect(stoppedAt).toBeGreaterThan(10);expect(stoppedAt).toBeLessThan(100);
 for(let phase=10;phase<stoppedAt;phase++) saved=update(saved,phase);
 expect(saved).toEqual(state);
});
