import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteEntry} from '../src/simulation/original-route-entry.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-entry.json',import.meta.url),'utf8'));
test('entry state and first range query match original executable',()=>{
 for(const [q,e,expectedCalls] of rows){
  const before=JSON.stringify(q),calls=[],tiles=[];
  const a=originalRouteEntry({...q,terrainAt:p=>{tiles.push(p);return {code:q.terrainCode};}},c=>{calls.push(c);return q.range;});
  expect(a).toEqual(e);expect(calls).toEqual(expectedCalls);expect(tiles).toEqual([e.originTile]);expect(JSON.stringify(q)).toBe(before);
 }
});
test('range query observes search flags before terrain lookup',()=>{
 const q=rows[0][0],order=[];
 const result=originalRouteEntry({...q,terrainAt:()=>{order.push('terrain');return {code:2};}},c=>{
  order.push('range');expect(c.worldFlags&0x800000).toBe(0x800000);expect(c.candidateSkillMask).toBe(q.skillMask);return 250;
 });
 expect(order).toEqual(['range','terrain']);expect(result.range).toBe(250);
});
test('fresh score grids have independently editable rows across searches',()=>{
 const q={...rows[0][0],terrainAt:()=>({code:2})};
 const a=originalRouteEntry(q,()=>200),b=originalRouteEntry(q,()=>200);
 a.scores[0][0]=99999;expect(a.scores[1][0]).toBe(0);expect(b.scores[0][0]).toBe(0);
});
