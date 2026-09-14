import {test,expect} from '@playwright/test';
import {originalCandidateImpact} from '../src/simulation/original-candidate-impact.js';
import {originalRandom} from '../src/simulation/original-rng.js';
const base={speed:1000,heading:0x20000000,verticalSpeed:192,flags:0,professional:false,luck:5,seed:2002,skillMask:0,facing:1,terrainCode:2,boundaryFlags:0,terrainFlags:0,centre:true,mode:0};
const run=q=>originalCandidateImpact({...base,...q});
test('pending rebound reverses heading and consumes exactly one seeded draw',()=>{
 const rng=originalRandom(2002),speed=rng.next(2000);
 expect(run({flags:0x100})).toEqual({speed,heading:0xa0000000,verticalSpeed:192,flags:0,seed:rng.state,draws:1});
 expect(run({flags:0x100,professional:true}).speed).toBe(1000+Math.trunc((speed-1000)*3/10));
});
test('collision flags halve now and schedule reversal on the next contact',()=>{
 const first=run({flags:0x80});expect(first).toMatchObject({speed:500,flags:0x100,draws:0});
 const next=originalCandidateImpact({...base,...first});expect(next).toMatchObject({heading:0xa0000000,flags:0,draws:1});
});
test('slope response uses bounded forward samples and original cross direction',()=>{
 const directions=[];
 const result=run({skillMask:4,slopeAt:d=>{directions.push(d);return directions.length===1?0:3;}});
 expect(directions).toEqual([4,1,1]);expect(result).toMatchObject({speed:232,verticalSpeed:384,draws:0});
});
test('surface stopping respects mode and marked centre exception',()=>{
 expect(run({terrainCode:17})).toMatchObject({speed:0,verticalSpeed:0});
 expect(run({terrainCode:17,terrainFlags:32})).toMatchObject({speed:1000,verticalSpeed:192});
 expect(run({terrainCode:17,terrainFlags:32,mode:2})).toMatchObject({speed:0,verticalSpeed:0});
 expect(run({terrainCode:17,boundaryFlags:1})).toMatchObject({speed:1000});
});
test('special terrain random turn is bounded by speed and edge conditions',()=>{
 expect(run({terrainCode:12}).draws).toBe(1);
 expect(run({terrainCode:12,speed:256}).draws).toBe(0);
 expect(run({terrainCode:12,boundaryFlags:1}).draws).toBe(0);
 expect(run({speed:0,flags:0x100})).toMatchObject({speed:0,draws:1});
});
