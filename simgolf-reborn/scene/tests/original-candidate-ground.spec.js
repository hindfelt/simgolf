import {test,expect} from '@playwright/test';
import {originalCandidateGround} from '../src/simulation/original-candidate-ground.js';
const base={speed:1024,heading:0x20000000,skillMask:0,rollCoefficient:3,forwardSlope:0,crossSlope:0,boundaryFlags:0,terrainCode:2,subX:8,subZ:8,crossedX:false,crossedZ:false,stepX:1,stepCosine:1,wallFlags:0};
const run=q=>originalCandidateGround({...base,...q});
test('candidate rolling uses original resistance bands',()=>{
 expect(run({})).toEqual({speed:960,heading:base.heading,resistance:3});
 expect(run({rollCoefficient:5}).speed).toBe(1040);
 expect(run({rollCoefficient:0,boundaryFlags:1}).speed).toBe(896);
});
test('only imagination applies directional slope corrections',()=>{
 expect(run({forwardSlope:3,crossSlope:2})).toEqual(run({}));
 expect(run({skillMask:4,forwardSlope:3,crossSlope:2})).toEqual({speed:512,heading:0x1c000000,resistance:0});
});
test('surface slowdown distinguishes interior from boundaries and centre from edges',()=>{
 expect(run({terrainCode:17}).speed).toBe(480);
 expect(run({terrainCode:17,boundaryFlags:1}).speed).toBe(960);
 expect(run({terrainCode:10,subX:6,subZ:10}).speed).toBe(480);
 expect(run({terrainCode:10,subX:5}).speed).toBe(960);
});
test('directional wall reflections require a tile crossing and matching bit',()=>{
 expect(run({wallFlags:5}).heading).toBe(base.heading);
 expect(run({crossedX:true,wallFlags:4}).heading).toBe(0xe0000000);
 expect(run({crossedZ:true,wallFlags:1}).heading).toBe(0x60000000);
 expect(run({crossedX:true,crossedZ:true,wallFlags:5}).heading).toBe(0xa0000000);
 expect(run({crossedX:true,stepX:-1,wallFlags:4}).heading).toBe(base.heading);
});
