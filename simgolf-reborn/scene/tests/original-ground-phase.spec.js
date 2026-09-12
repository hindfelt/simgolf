import {test,expect} from '@playwright/test';
import {originalGroundPhase} from '../src/simulation/original-ground-phase.js';
const before={x:20992,z:20992,height:0,verticalSpeed:0,speed:600,heading:0x10000000,angularOffset:0,seed:17};
const args={before,ball:{...before},originTerrainCode:1,club:13,eventFlag:false,centreFlag:0,phaseCounter:1,seed:17};
test('surface slowdown precedes cup capture and capture bypasses edge reflection',()=>{
 const result=originalGroundPhase(args,{cellAt:()=>({code:17,rollCoefficient:3,flags:128,edgeFlags:255}),slopeAt:()=>0});
 expect(result.captured).toBe(true);expect(result.ball.speed).toBe(0);
 expect(result.reflectedX).toBe(false);expect(result.reflectedZ).toBe(false);
 expect(result.ball.heading).toBe(before.heading);
});
test('terrain adapter uses old cell metadata while slopes use the new position',()=>{
 const slopes=[];
 const ball={...before,x:22016,z:19968};
 const result=originalGroundPhase({...args,ball},{
  cellAt:(x,z)=>({code:x===20&&z===20?1:2,rollCoefficient:3,flags:0,edgeFlags:5}),
  slopeAt:(x,z,d)=>{slopes.push([x,z,d]);return 0;},
 });
 expect(slopes).toEqual([[ball.x,ball.z,1],[ball.x,ball.z,3]]);
 expect(result.reflectedX).toBe(true);expect(result.reflectedZ).toBe(true);
 expect(result.ball.heading).toBe(0x90000000);expect(result.ball.speed).toBe(563);
 expect(args.before).toEqual(before);
});
test('airborne positions cannot accidentally take the ground branch',()=>{
 expect(()=>originalGroundPhase({...args,ball:{...before,height:2}},{})).toThrow(/contact height/);
});
