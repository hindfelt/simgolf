import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoApproach} from '../src/simulation/original-auto-approach.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-approach.json',import.meta.url),'utf8'));
const mapFor=q=>({terrainAt:(x,z)=>q.cells.find(c=>c[0]===x&&c[1]===z)?.[2]??0,
 shotClassAt:code=>q.classes[code]});
test('short approach matches original executable and preserves caller state',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);
  expect(originalAutoApproach(q,mapFor(q))).toEqual(e);
  expect(JSON.stringify(q)).toBe(before);
 }
 expect(rows.some(([q,e])=>e.distance>q.distance)).toBe(true);
 expect(rows.some(([q,e])=>e.distance<q.distance)).toBe(true);
 expect(rows.some(([q,e])=>e.distance===q.distance)).toBe(true);
});
test('green and close approach publish the target centre without consulting terrain',()=>{
 const map={terrainAt:()=>{throw Error('Unexpected terrain read');},shotClassAt:()=>{throw Error('Unexpected metadata read');}};
 for(const q of [{terrainCode:1,distance:75},{terrainCode:2,distance:25}])
  expect(originalAutoApproach({...q,target:{x:0,z:49},heading:0},map)).toEqual({distance:q.distance,landing:{x:512,z:50688},diagnostics:0});
});
test('uses current terrain classes when metadata changes between approaches',()=>{
 const q={target:{x:25,z:25},terrainCode:2,distance:48,heading:0};
 const classes={2:0,17:0};
 const map={terrainAt:(x,z)=>z>25?17:2,shotClassAt:code=>classes[code]};
 expect(originalAutoApproach(q,map).distance).toBe(48);
 classes[17]=8;
 expect(originalAutoApproach(q,map).distance).toBe(54);
 classes[17]=-8;
 expect(originalAutoApproach(q,map).distance).toBe(42);
});
