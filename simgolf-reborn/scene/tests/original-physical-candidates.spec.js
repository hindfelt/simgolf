import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPhysicalCandidates,originalPhysicalRouteSearch} from '../src/simulation/original-physical-candidates.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
import {originalShotMap} from '../src/simulation/original-shot-map.js';
const {initial,rows}=JSON.parse(readFileSync(new URL('./fixtures/original-shared-candidate-trials.json',import.meta.url),'utf8'));
const sharedMap=q=>originalShotMap({terrain:Uint8Array.from(q.terrain),marks:Uint16Array.from(q.marks),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)},readHeight:()=>0,globalFlags:0,metadata:code=>({flags:0,kind:q.kinds[code],shotClass:q.classes[code+1],bounceCoefficient:3,rollCoefficient:0})});
test('search callback adapter reproduces sequential original candidate results',()=>{
 let shared=structuredClone(initial);
 for(const [q,e] of rows){
  const map=sharedMap(q),physical={professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5,skillMask:q.skillMask};
  const before=JSON.stringify({q,shared}),adapter=originalPhysicalCandidates({launch:q,physical,map,shared});
  const result=adapter.simulate({actorId:q.actorId,x:q.plannerArgument,z:q.targetZ,curve:q.mode},{mode:q.driftMode,target:q.target,worldFlags:q.worldFlags});
  expect(result.landing).toEqual(e.landing);expect(adapter.sharedState()).toEqual(e);
  expect(adapter.shotClassAt(17)).toBe(8);expect(adapter.terrainAt({x:25,z:25}).shotClass).toBe(adapter.shotClassAt(q.terrain[1275]));
  expect(JSON.stringify({q,shared})).toBe(before);expect(map.planning.shotClassAt(17)).toBe(q.classes[18]);
  shared=adapter.sharedState();shared.cache.next=999;
  expect(adapter.sharedState()).toEqual(e);shared=adapter.sharedState();
 }
});

test('complete physical search runs without supplied landing or assessment results',()=>{
 const q=JSON.parse(readFileSync(new URL('./fixtures/original-ranged-route-search.json',import.meta.url),'utf8'))[0][0];
 const launch={...rows[0][0],x:q.origin.x,z:q.origin.z,actorId:q.actorId,actorFlags:q.actorFlags,skillMask:q.skillMask,actorClass:q.actorClass,abilityFlags:q.abilityFlags,rangeInput:q.rangeInput,shotCounter:q.shotCounter,cup:q.cup};
 launch.rangeInput={...q.rangeInput,skillMask:q.skillMask,shot:q.shotCounter,professional:q.actorClass!==0,abilityFlags:q.abilityFlags};
 const map=sharedMap(launch),physical={professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5};
 const input={...q,mode:2};
 const a=originalPhysicalRouteSearch(input,{launch,physical,map,shared:initial});
 expect(a.search.work).toBeGreaterThan(0);expect(a.shared.seed).not.toBe(initial.seed);
 expect(a.result.target.x).toBeGreaterThanOrEqual(0);expect(a.result.target.x).toBeLessThan(50);
 expect(originalPhysicalRouteSearch(structuredClone(input),{launch:structuredClone(launch),physical,map,shared:structuredClone(initial)})).toEqual(a);
});
