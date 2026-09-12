import {test,expect} from '@playwright/test';
import {originalObstacleHeight} from '../src/simulation/original-obstacle-height.js';
import {originalCandidateAirCollision,originalCandidateAirObstacle} from '../src/simulation/original-candidate-air-collision.js';
const run=q=>originalObstacleHeight({terrainCode:13,height:100,variant:0,terrainFlags:0,seed:2002,...q});
test('height bounds are strict and random height is generated before comparison',()=>{
 const result=run({});expect(result.lower).toBe(50);expect(result.upper).toBeGreaterThanOrEqual(200);
 expect(run({height:result.upper}).obstructed).toBe(false);
 expect(run({height:50}).obstructed).toBe(false);
 expect(run({height:51}).obstructed).toBe(true);
 expect(run({height:10000}).draws).toBe(1);
});
test('variant changes terrain height band and special types use metadata',()=>{
 expect(run({terrainCode:15,variant:1})).toMatchObject({lower:100,draws:1});
 expect(run({terrainCode:15,variant:3})).toMatchObject({lower:20,draws:1});
 expect(run({terrainCode:21,terrainFlags:4})).toMatchObject({upper:0,obstructed:false,draws:0});
 expect(run({terrainCode:22,terrainFlags:5})).toMatchObject({upper:200,obstructed:true,draws:0});
 expect(run({variant:-1})).toMatchObject({lower:13,upper:13,draws:0});
});
test('obstacle detector hands its advanced RNG state to collision response',()=>{
 const detection=run({});
 const collision=originalCandidateAirCollision({position:{x:26112,z:26112},oldTile:{x:25,z:25},speed:1000,heading:0,flags:0,mode:0,professional:false,abilityFlags:0,luck:0,...detection});
 expect(detection.draws).toBe(1);expect(collision.draws).toBe(3);expect(collision.hit).toBe(true);
 expect(collision.seed).not.toBe(detection.seed);
});

test('combined design-mode path still consumes the obstacle-height draw',()=>{
 const input={position:{x:26112,z:26112},oldTile:{x:25,z:25},speed:1000,heading:0,flags:0,mode:2,professional:false,abilityFlags:0,luck:0,terrainCode:13,height:100,variant:0,terrainFlags:0,seed:2002};
 const result=originalCandidateAirObstacle(input);
 expect(result).toMatchObject({speed:1000,heading:0,hit:false,draws:1,seed:run({}).seed});
});
