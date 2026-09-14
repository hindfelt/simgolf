import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {ORIGINAL_SINE_TABLE,originalSine,originalBallPositionStep} from '../src/simulation/original-ball-position.js';
import {originalPuttingAim} from '../src/simulation/original-putting.js';
import {originalGroundResponse,originalBallStopped} from '../src/simulation/original-ground-motion.js';
const initial={x:1000,z:1000,height:0,speed:1024,verticalSpeed:0,heading:0};
test('table constants and movement divisors match executable',()=>{
 const b=readFileSync(new URL("../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",import.meta.url));
 expect(b.readDoubleLE(0xbaa48)).toBe(65535);
 expect(b.readDoubleLE(0xbaa50)).toBe(0.006159985596078431);
 const bytes=(va,n)=>b.subarray(va-0x400000,va-0x400000+n).toString('hex');
 expect(bytes(0x491399,2)).toBe('d9fe');expect(bytes(0x4a57af,3)).toBe('80cc0c');
 expect(bytes(0x42bde9,3)).toBe('c1f804');expect(bytes(0x42be56,3)).toBe('c1f805');
 expect(ORIGINAL_SINE_TABLE).toHaveLength(257);
 expect(ORIGINAL_SINE_TABLE[0]).toBe(0);expect(ORIGINAL_SINE_TABLE[255]).toBe(65535);
});
test('cardinal headings follow original axes',()=>{
 expect([0,0x40000000,0x80000000,0xc0000000].map(heading=>originalBallPositionStep({...initial,heading}))).toEqual([
 {x:1000,z:936,height:0},{x:1064,z:1000,height:0},{x:1000,z:1064,height:0},{x:936,z:1000,height:0}]);
 expect(originalSine(0x20000000,64)).toBe(45);
});
test('speed truncation and signed coordinate wrapping occur before ground response',()=>{
 expect(originalBallPositionStep({...initial,speed:15,verticalSpeed:31})).toEqual({x:1000,z:1000,height:0});
 expect(originalBallPositionStep({...initial,speed:0,verticalSpeed:-33})).toEqual({x:1000,z:1000,height:-1});
 expect(originalBallPositionStep({...initial,x:0x7fffffff,heading:0x40000000}).x).toBe(-2147483585);
 expect(()=>originalBallPositionStep({...initial,heading:NaN})).toThrow();
});
test('signed integer products and magnitude bands differ from floating sine',()=>{
 const table=Array(257).fill(32768);
 expect(originalSine(0,65534,table)).toBe(32767);
 expect(originalSine(0,65535,table)).toBe(32640);
 expect(originalSine(0,16777214,table)).toBe(8388480);
 expect(originalSine(0,16777215,table)).toBe(8355840);
 expect(originalSine(0,-65,table)).toBe(-33);
 expect(originalSine(0,65534,Array(257).fill(65535))).toBe(-3);
});
test('launch curvature, positions and ground response resume from serialized state',()=>{
 const aim=originalPuttingAim({distanceYards:12,windowBeforeGreen:20,attitude:0,greenVariant:255,seed:1234});
 let state={...initial,angularOffset:aim.angularOffset,seed:aim.rngState,phase:0}, saved;
 const advance=state=>{
  const position=originalBallPositionStep(state);
  const response=originalGroundResponse({...state,terrainCode:1,originTerrainCode:1,rollCoefficient:3,
   forwardSlope:0,crossSlope:0,boundaryFlags:0,phaseCounter:state.phase});
  return {...state,...position,speed:response.speed,heading:response.heading,
   angularOffset:response.angularOffset,seed:response.rngState,phase:state.phase+1};
 };
 while(!originalBallStopped(state) && state.phase<100) {
  state=advance(state);if(state.phase===10) saved=JSON.parse(JSON.stringify(state));
 }
 expect(state.phase).toBeLessThan(100);expect(state.x).not.toBe(initial.x);
 while(saved.phase<state.phase) saved=advance(saved);
 expect(saved).toEqual(state);
});
