import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalObjectIndex} from '../src/simulation/original-object-index.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-object-index.json',import.meta.url),'utf8'));
test('object scans match native records without mutating them',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);
  expect(originalObjectIndex(q.x,q.z,{objectAt:i=>q.records[i],baseSizeAt:t=>q.sizes[t],expansionAt:t=>q.expansions[t]})).toBe(e);
  expect(JSON.stringify(q)).toBe(before);
 }
 expect(rows.some(([,e])=>e===255)).toBe(true);expect(rows.some(([,e])=>e===-1)).toBe(true);expect(rows.some(([,e])=>e===0)).toBe(true);
});
test('type seven excludes expansion and uses half-open footprint boundaries',()=>{
 const records=Array.from({length:256},()=>({type:-1,x:0,z:0}));records[255]={type:7,x:25,z:25};
 const objects={objectAt:i=>records[i],baseSizeAt:()=>2,expansionAt:()=>{throw Error('Type seven must not read expansion');}};
 expect(originalObjectIndex(26,26,objects)).toBe(255);
 expect(originalObjectIndex(27,26,objects)).toBe(-1);
 expect(originalObjectIndex(26,27,objects)).toBe(-1);
});
