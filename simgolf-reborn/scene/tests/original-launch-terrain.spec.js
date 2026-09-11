import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchTerrain} from '../src/simulation/original-launch-terrain.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-terrain.json',import.meta.url),'utf8'));
const kindAt=p=>(p.x+p.z)%2?0:13;
test('terrain-dependent launch matches original full state for normal, low and approach shots',()=>{
 let cache=originalStrengthCache();const types=new Set();
 for(const [q,e] of rows){
  const before=JSON.stringify(cache),actual=originalLaunchTerrain(q,cache,kindAt);
  expect(actual).toEqual(e);expect(JSON.stringify(cache)).toBe(before);types.add(actual.shotType);
  cache=JSON.parse(JSON.stringify(actual.cache));
 }
 expect([...types].sort()).toEqual([0,3,4]);
});
test('low-shot selection takes precedence and clears curve',()=>{
 const [q]=rows.find(([q,e])=>e.shotType===4);
 const result=originalLaunchTerrain(q,originalStrengthCache(),kindAt);
 expect(result.shotType).toBe(4);expect(result.curve).toBe(0);expect(result.actorFlags&0x80).toBe(0);
});
test('earlier contact flags clear before terrain branch adds new backspin',()=>{
 const [q]=rows.find(([q,e])=>e.shotType===3);
 const result=originalLaunchTerrain({...q,actorFlags:q.actorFlags|0x180},originalStrengthCache(),kindAt);
 expect(result.shotType).toBe(3);expect(result.actorFlags&0x180).toBe(0x80);
});
