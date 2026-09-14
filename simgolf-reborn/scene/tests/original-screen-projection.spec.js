import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalScreenProjection} from '../src/simulation/original-screen-projection.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-screen-projection.json',import.meta.url)));
test('projection coordinates, visibility and terrain query order match original execution',()=>{
 const combinations=new Set();
 for(const [q,expected] of rows){
  combinations.add(`${q.rotation}:${q.terrain.flags}:${q.magnify}`);
  const before=structuredClone(q),calls=[];
  const result=originalScreenProjection(q,{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:(c,r)=>{calls.push(['object',c,r]);return q.terrain.object;},cornerHeight:(c,r,d)=>{calls.push(['corner',c,r,d]);return q.terrain.corners[d];}});
  expect({result,calls}).toEqual(expected);expect(q).toEqual(before);
 }
 expect(combinations.size).toBe(48);
});
test('off-screen rejection happens before terrain access and accepted flat points retain original offsets',()=>{
 const q={x:20*1024+512,z:20*1024+512,cameraX:20,cameraZ:20,scale:4,width:800,height:600,rotation:0,margin:0,heightScale:16,magnify:false};
 expect(originalScreenProjection(q,{flagsAt:()=>8})).toEqual({x:432,y:300,visible:true});
 expect(originalScreenProjection({...q,x:100*1024},{flagsAt:()=>{throw Error('No terrain query expected');}}).visible).toBe(false);
 expect(originalScreenProjection({...q,magnify:true},{flagsAt:()=>8})).toEqual({x:464,y:300,visible:true});
});
