import {test,expect} from '@playwright/test';
import {createOriginalMotionTerrain} from '../src/simulation/original-motion-terrain.js';
import {originalAirPhase} from '../src/simulation/original-air-phase.js';
import {originalGroundResponse} from '../src/simulation/original-ground-motion.js';
test('terrain adapter exposes slopes and rereads heights after an edit',()=>{
 let height=3;
 const world=createOriginalMotionTerrain({globalFlags:0,readCell:()=>({code:2,metadataFlags:0}),
  readCornerHeight:(r,c,d)=>height+([1,3].includes(d)?1:0),readVertexHeight:()=>height});
 expect(world.heightAt(20992,20992)).toBe(8);expect(world.slopeAt(20992,20992,2)).toBe(1);
 height=5;expect(world.heightAt(20992,20992)).toBe(40);
});
test('signed velocity produced by landing slopes survives subsequent air and ground phases',()=>{
 const ball={x:20992,z:20992,height:100,verticalSpeed:0,speed:-1000,heading:0,angularOffset:0};
 const air=originalAirPhase({ball,previousTerrainHeight:0,terrainHeight:0,cellX:20,cellZ:20,terrainCode:1,
  terrainFlags:0,variant:0,stateFlags:0,skillEnabled:false,skillMask:0,luck:0,seed:17});
 expect(air.ball.speed).toBe(-969);
 const ground=originalGroundResponse({...ball,terrainCode:1,originTerrainCode:1,rollCoefficient:3,
  forwardSlope:0,crossSlope:0,boundaryFlags:0,phaseCounter:1,seed:17});
 expect(ground.speed).toBe(-938);
});
