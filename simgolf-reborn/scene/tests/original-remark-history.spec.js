import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkHistory} from '../src/simulation/original-remark-history.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-history.json',import.meta.url)));
test('all actor bytes and pre-reaction snapshots match the original history stage',()=>{
 for(const [q,expected] of rows){
  const record=Uint8Array.from(q.record),result=originalRemarkHistory(record,q.kind,q.value);
  expect([...result.before]).toEqual(expected.before);
  expect([...result.actor]).toEqual(expected.actor);
  expect([...record]).toEqual(q.record);
 }
});
test('history drops only the oldest entries, wraps bytes and preserves word ordering',()=>{
 const actor=new Uint8Array(256);actor[0x21]=23;actor[0x22]=2;
 for(let i=0;i<10;i++){actor[0x70+i]=i;actor[0x7a+i]=10+i;new DataView(actor.buffer).setUint16(0x88+i*2,1000+i,true);}
 const result=originalRemarkHistory(actor,4,0x12345678);
 expect([...result.actor.slice(0x70,0x7a)]).toEqual([4,0,1,2,3,4,5,6,7,8]);
 expect(result.actor[0x7a]).toBe(0);
 expect(new DataView(result.actor.buffer).getUint16(0x88,true)).toBe(0x5678);
 expect(new DataView(result.actor.buffer).getUint16(0x9a,true)).toBe(1008);
 expect(originalRemarkHistory(actor,3,0).actor[0x7a]).toBe(255);
 result.actor[0]=90;expect(result.before[0]).toBe(0);expect(actor[0]).toBe(0);
});
