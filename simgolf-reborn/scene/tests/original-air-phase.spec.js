import {test,expect} from '@playwright/test';
import {originalAirPhase} from '../src/simulation/original-air-phase.js';
const q={ball:{x:20992,z:20992,height:100,speed:1024,verticalSpeed:0,heading:0,angularOffset:100,seed:17},
 previousTerrainHeight:32,terrainHeight:16,cellX:20,cellZ:20,terrainCode:1,terrainFlags:0,variant:0,
 stateFlags:0,skillEnabled:false,skillMask:0,luck:0,seed:17};
test('airborne height follows terrain while drag and curvature retain original units',()=>{
 const result=originalAirPhase(q);
 expect(result.ball.height).toBe(116);expect(result.ball.speed).toBe(992);expect(result.ball.heading).toBe(50);
 expect(result.hit).toBe(false);expect(result.draws).toBe(0);
 expect(q.ball.speed).toBe(1024);
});
test('already-deflected balls still consume the obstacle height draw',()=>{
 const result=originalAirPhase({...q,terrainCode:14,stateFlags:2});
 expect(result.hit).toBe(false);expect(result.draws).toBe(1);expect(result.rngState).not.toBe(q.seed);
 expect(result.ball.speed).toBe(992);
});
test('a central obstacle impact changes direction, slows the ball and records the effect',()=>{
 const result=originalAirPhase({...q,terrainCode:14});
 expect(result.hit).toBe(true);expect(result.stateFlags&2).toBe(2);
 expect(result.ball.speed).toBeLessThan(992);expect(result.ball.heading).not.toBe(50);
 expect(result.draws).toBe(5);expect([6,7,8]).toContain(result.sound);
});
