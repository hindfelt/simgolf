import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchPreparation} from '../src/simulation/original-launch-preparation.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-preparation.json',import.meta.url),'utf8'));
const mapFor=q=>({terrainAt:(x,z)=>q.terrain[x*50+z],kindAt:c=>q.kinds[c],
 shotClassAt:lie=>q.classes[lie+1],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});
test('automatic-compatible preparation matches original at the split point',()=>{
 let cache=originalStrengthCache();
 for(const [q,e] of rows){
  expect(q.plannerArgument).toBe(-1);
  const before=JSON.stringify({q,cache});
  const result=originalLaunchPreparation(q,cache,mapFor(q));
  expect(result).toEqual(e);expect(JSON.stringify({q,cache})).toBe(before);cache=result.cache;
 }
});
test('preparation replays from serialized map and shared cache',()=>{
 let cache=originalStrengthCache();
 for(const [q] of rows.slice(0,8)){
  const saved=JSON.parse(JSON.stringify({q,cache}));
  const result=originalLaunchPreparation(q,cache,mapFor(q));
  expect(originalLaunchPreparation(saved.q,saved.cache,mapFor(saved.q))).toEqual(result);
  cache=result.cache;
 }
});
