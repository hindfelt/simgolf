import {test,expect} from '@playwright/test';
import {originalRouteCandidate} from '../src/simulation/original-route-candidate.js';
const base={candidate:{x:30,z:25},start:{x:10,z:25},cup:{x:40,z:25},previousTarget:{x:35,z:25},actorFlags:0,range:200,shotDistance:150,cupDistance:750};
function check(overrides={},code=2,shotClass=0,neighbor=0){
 const q={...base,...overrides};
 return originalRouteCandidate({...q,terrainAt:p=>({code,shotClass:p.x===q.candidate.x&&p.z===q.candidate.z?shotClass:neighbor})});
}
test('candidate must make progress and respect range tolerance',()=>{
 expect(check()).toEqual({eligible:true,supported:true,remaining:10,initial:30});
 expect(check({shotDistance:216}).eligible).toBe(true);
 expect(check({shotDistance:217}).reason).toBe('beyond-range');
 expect(check({shotDistance:65}).reason).toBe('too-short');
 expect(check({shotDistance:66}).eligible).toBe(true);
 expect(check({candidate:{x:9,z:25}}).reason).toBe('insufficient-progress');
});
test('isolated class-one lie requires more progress than one beside better terrain',()=>{
 const q={candidate:{x:20,z:25}};
 expect(check(q,2,1,1).reason).toBe('insufficient-progress');
 expect(check(q,2,1,0).eligible).toBe(true);
 expect(check({},2,1,1)).toEqual({eligible:true,supported:false,remaining:10,initial:30});
});
test('candidate green must be within three tiles of this hole cup',()=>{
 expect(check({},1).reason).toBe('distant-green');
 expect(check({candidate:{x:37,z:25}},1).eligible).toBe(true);
 expect(check({candidate:{x:36,z:25}},1).reason).toBe('distant-green');
});
test('actor flag excludes previous target but allows very short alternatives',()=>{
 expect(check({actorFlags:1,candidate:base.previousTarget}).reason).toBe('previous-target');
 expect(check({actorFlags:1,shotDistance:20}).eligible).toBe(true);
});
test('map bounds and excluded surfaces reject before evaluating neighbors',()=>{
 expect(check({candidate:{x:50,z:25}}).reason).toBe('outside-map');
 expect(check({},20).reason).toBe('excluded-terrain');
 expect(check({},0).reason).toBe('unsuitable-terrain');
 expect(check({},2,2).reason).toBe('unsuitable-terrain');
 expect(check({candidate:base.start}).reason).toBe('current-tile');
});
