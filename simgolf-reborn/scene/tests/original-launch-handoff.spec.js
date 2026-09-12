import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchPreparation} from '../src/simulation/original-launch-preparation.js';
import {originalLaunchHandoff} from '../src/simulation/original-launch-handoff.js';
import {originalAutoPreparedLaunch} from '../src/simulation/original-auto-prepared-launch.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-handoff.json',import.meta.url),'utf8'));
test('handoff state matches native preparation writes and owns the cache snapshot',()=>{
 let cache=originalStrengthCache();
 for(const [q,e] of rows){
  const prepared=originalLaunchPreparation(q,cache,{terrainAt:(x,z)=>q.terrain[x*50+z],kindAt:c=>q.kinds[c],shotClassAt:c=>q.classes[c+1],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});
  const before=JSON.stringify(prepared),update=originalLaunchHandoff(q.heading,prepared);
  expect(update).toEqual(e);update.state.cache.entries[0].speed=-1;
  expect(JSON.stringify(prepared)).toBe(before);cache=prepared.cache;
 }
});
test('prepared launch wrapper reaches native final results despite stale handoff fields',()=>{
 const finals=JSON.parse(readFileSync(new URL('./fixtures/original-auto-launch-finish.json',import.meta.url),'utf8'));
 const matching=finals.filter(([q])=>q.aimHeading===(((((q.heading|0)>>28)+1)>>1)&7));
 expect(matching.length).toBeGreaterThan(0);
 for(const [q,e] of matching){
  const a=q.state.actor;
  const prepared={strength:q.distance,heading:q.heading,referenceSpeed:q.referenceSpeed,modifier:q.modifier,curve:q.curveArgument,
   seed:q.state.seed,cache:q.state.cache,speed:q.state.speed,verticalSpeed:q.state.verticalSpeed,club:a.club,actorFlags:a.actorFlags,
   angularOffset:a.angularOffset,shotType:a.stateCode,terrainCode:q.terrainCode,
   assessment:{dominantDirection:q.pathHeading,dominantCode:q.cueValue,markedTerrain:q.state.sceneryTile,sampleX:q.state.pathHeading,rating:a.elevationCounter}};
  const stale=structuredClone(q);stale.state.speed=17;stale.state.seed=1;stale.state.scannedTile=99;stale.state.namedReference=99;stale.state.actor.elevationCounter=99;
  expect(originalAutoPreparedLaunch(stale,prepared,middleMap(q),middleEffects(q))).toEqual(e);
 }
});
