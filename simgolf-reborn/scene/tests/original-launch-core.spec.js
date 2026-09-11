import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchCore} from '../src/simulation/original-launch-core.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-core.json',import.meta.url),'utf8'));
test('combined original launch stages preserve full state and call ordering',()=>{
 let cache=originalStrengthCache();
 for(const [q,expected] of rows){
  const before=JSON.stringify(cache),actual=originalLaunchCore(q,cache);
  expect(actual).toEqual(expected);expect(JSON.stringify(cache)).toBe(before);
  cache=JSON.parse(JSON.stringify(actual.cache));
 }
});
test('full-range reference search differs from shorter selected shot',()=>{
 const [q]=rows.find(([q])=>q.distance<=0);
 const result=originalLaunchCore(q,originalStrengthCache());
 expect(result.referenceSpeed).toBeGreaterThan(result.speed);
 expect(result.cache.entries.some(e=>e.distance===Math.trunc(q.range*4/5))).toBe(true);
});
test('earlier miss flag is cleared before evaluating the current shot',()=>{
 const q={...rows[0][0],distance:50,terrainCode:2,actorFlags:0x400000,worldFlags:0x800000};
 expect(originalLaunchCore(q,originalStrengthCache()).actorFlags&0x400000).toBe(0);
});
test('intermediate non-putter composition rejects putter branch',()=>{
 const q={...rows[0][0],distance:20,range:200,terrainCode:1,actorFlags:0,explicitTarget:false};
 expect(()=>originalLaunchCore(q,originalStrengthCache())).toThrow('Putter launch');
});
