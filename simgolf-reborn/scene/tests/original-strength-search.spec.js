import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalStrengthCache,originalStrengthSearch,originalAirRange} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-strength-search.json',import.meta.url),'utf8'));
test('complete strength cache evolves exactly like the original across modes and eviction',()=>{
 let cache=originalStrengthCache();
 for(const [q,speed,expected] of rows){
  const before=JSON.stringify(cache),a=originalStrengthSearch(q,cache);
  expect(a.speed).toBe(speed);expect(a.cache).toEqual(expected);
  expect(JSON.stringify(cache)).toBe(before);
  cache=JSON.parse(JSON.stringify(a.cache));
 }
});
test('original zero-initialized cache and cross-mode hits are preserved',()=>{
 const empty=originalStrengthCache();
 expect(originalStrengthSearch({distance:0,verticalSpeed:0,mode:0},empty)).toEqual({speed:0,cache:empty,hit:true});
 const q={distance:100,verticalSpeed:700,mode:0};
 const first=originalStrengthSearch(q,empty);
 const hit=originalStrengthSearch({...q,mode:1,rollCoefficient:2},first.cache);
 expect(hit.hit).toBe(true);expect(hit.speed).toBe(first.speed);expect(hit.cache.next).toBe(1);
 expect(originalStrengthSearch({...q,mode:1,rollCoefficient:2},empty).speed).not.toBe(first.speed);
});
test('air estimate includes the initial step even without vertical launch',()=>{
 expect(originalAirRange(800,0)).toBe(100);
 expect(originalAirRange(800,512)).toBeGreaterThan(100);
});
