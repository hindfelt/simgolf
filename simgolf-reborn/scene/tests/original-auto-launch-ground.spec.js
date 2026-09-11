import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoLaunchGround} from '../src/simulation/original-auto-launch-ground.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-launch-ground.json',import.meta.url),'utf8'));
const mapFor=q=>({terrainAt:()=>q.targetTerrainCode,
 heightAt:(x,z)=>x===q.target.x&&z===q.target.z?q.targetHeight:q.originHeight});
test('automatic launch ground states match original with persistent cache and immutable inputs',()=>{
 let cache=originalStrengthCache();
 for(const [q,e] of rows){
  const before=JSON.stringify({q,cache});
  const a=originalAutoLaunchGround(q,cache,mapFor(q));
  expect(a).toEqual(e);expect(JSON.stringify({q,cache})).toBe(before);cache=a.cache;
 }
 expect(rows.some(([q,e])=>e.elevationCounter<q.elevationCounter)).toBe(true);
});
test('non-putters and non-green targets retain speed and cache',()=>{
 const q=rows[0][0],cache=originalStrengthCache();
 for(const fields of [{club:4,targetTerrainCode:1},{club:13,targetTerrainCode:2}]){
  const input={...q,...fields};const result=originalAutoLaunchGround(input,cache,mapFor(input));
  expect(result.speed).toBe(q.speed);expect(result.cache).toBe(cache);
 }
});
test('putt recalibration respects original cache hits even after roll coefficient changes',()=>{
 const q={...rows[0][0],club:13,targetTerrainCode:1,distance:30,rollCoefficient:3};
 const a=originalAutoLaunchGround(q,originalStrengthCache(),mapFor(q));
 const b=originalAutoLaunchGround({...q,rollCoefficient:4},a.cache,mapFor(q));
 expect(b.speed).toBe(a.speed);expect(b.cache).toBe(a.cache);
});
