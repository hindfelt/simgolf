import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoTargetResult} from '../src/simulation/original-auto-target-result.js';
import {originalHeading} from '../src/simulation/original-heading.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-target-result.json',import.meta.url),'utf8'));
const q={x:10000,z:11000,target:{x:20,z:21},cornerTarget:false,actorFlags:0,skillMask:0,score:19};
test('post-search aim and score match original executable fixtures without mutations',()=>{
 for(const [input,e] of rows){const before=JSON.stringify(input);expect(originalAutoTargetResult(input,(x,z)=>input.scores[x*50+z])).toEqual(e);expect(JSON.stringify(input)).toBe(before);}
});
test('corner-target flag changes the aim point by half a tile',()=>{
 const center=originalAutoTargetResult({...q,actorFlags:0x10000000},()=>0),corner=originalAutoTargetResult({...q,cornerTarget:true},()=>0);
 expect(center.dx-corner.dx).toBe(512);expect(center.dz-corner.dz).toBe(512);expect(center.actorFlags&0x10000000).toBe(0);expect(corner.actorFlags&0x10000000).toBe(0x10000000);
});
test('score grid is consulted only with original skill bit four',()=>{
 expect(originalAutoTargetResult(q,()=>{throw Error('Unexpected score read');}).score).toBe(19);
 const reads=[];expect(originalAutoTargetResult({...q,skillMask:4},(x,z)=>{reads.push([x,z]);return 10;}).score).toBe(10);
 expect(reads).toEqual([[20,21],[20,22],[20,20],[19,21],[21,21],[20,20],[20,22],[21,21],[19,21]]);
});
test('heading uses the rounded yard vector rather than the full fixed-point vector',()=>{
 const a=originalAutoTargetResult({...q,x:20000,z:21100},()=>0);
 expect(a.heading).toBe(originalHeading(Math.imul(a.dx,25)>>10,Math.imul(a.dz,25)>>10));
 expect(a.heading).not.toBe(originalHeading(a.dx,a.dz));
});
