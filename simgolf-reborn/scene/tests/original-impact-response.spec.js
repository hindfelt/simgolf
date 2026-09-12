import {test,expect} from '@playwright/test';
import {originalImpactResponse} from '../src/simulation/original-impact-response.js';
const q={speed:1000,heading:0,verticalSpeed:128,stateFlags:0,direction:0,scatterCoefficient:0,currentTerrainCode:1,boundaryFlags:0,seed:17};
test('deferred reversal clears its flag without the candidate simulator extra random draw',()=>{
 const a=originalImpactResponse({...q,stateFlags:256},()=>0);
 expect(a.heading).toBe(0x80000000);expect(a.stateFlags).toBe(0);expect(a.speed).toBe(1000);expect(a.draws).toBe(0);
 const b=originalImpactResponse({...q,stateFlags:128},()=>0);
 expect(b.speed).toBe(500);expect(b.stateFlags).toBe(256);
});
test('landing slope samples preserve order and terrain stop follows scattering',()=>{
 const queries=[];
 const a=originalImpactResponse({...q,scatterCoefficient:2,currentTerrainCode:17},d=>{queries.push(d);return 1;});
 expect(queries).toEqual([2,0,0]);expect(a.draws).toBe(1);expect(a.stoppedByTerrain).toBe(true);
 expect(a.speed).toBe(0);expect(a.verticalSpeed).toBe(0);
 const b=originalImpactResponse({...q,currentTerrainCode:17,boundaryFlags:8},()=>0);
 expect(b.stoppedByTerrain).toBe(false);expect(b.speed).toBe(1000);
});
