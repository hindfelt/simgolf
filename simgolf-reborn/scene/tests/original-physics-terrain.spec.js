import {test,expect} from '@playwright/test';
import {originalPhysicsHeight,originalPhysicsSlope} from '../src/simulation/original-physics-terrain.js';
const heights={5:3,7:4,1:7,3:9};
const base={x:10*1024+512,z:10*1024+512,metadataFlags:0,globalFlags:0,terrainCode:2,cornerHeight:(r,c,d)=>heights[d]};
test('height interpolates original corners with baseline three and fixed-point rounding',()=>{
 expect(originalPhysicsHeight({...base,x:10*1024,z:10*1024})).toBe(16);
 expect(originalPhysicsHeight(base)).toBe(44);
 expect(originalPhysicsHeight({...base,cornerHeight:()=>6})).toBe(48);
});
test('surface metadata selects flat, minimum or maximum height before corners',()=>{
 const vertexHeight=(r,c)=>r===11?8:4,cornerHeight=()=>{throw Error('Must skip corners');};
 expect(originalPhysicsHeight({...base,metadataFlags:8,cornerHeight})).toBe(0);
 expect(originalPhysicsHeight({...base,metadataFlags:2,vertexHeight,cornerHeight})).toBe(16);
 expect(originalPhysicsHeight({...base,metadataFlags:4,vertexHeight,cornerHeight})).toBe(80);
});
test('cardinal slope switches corner pairs strictly after tile centre',()=>{
 expect(originalPhysicsSlope(base,2)).toBe(3);
 expect(originalPhysicsSlope({...base,z:base.z+1},2)).toBe(6);
 expect(originalPhysicsSlope(base,4)).toBe(-1);
 expect(originalPhysicsSlope({...base,x:base.x+1},4)).toBe(2);
 expect(originalPhysicsSlope(base,1)).toBe(2);
});
test('slope bypasses terrain and global flattening modes',()=>{
 for(const change of [{terrainCode:7},{terrainCode:9},{metadataFlags:2},{metadataFlags:4},{metadataFlags:8},{globalFlags:1}])
 expect(originalPhysicsSlope({...base,...change,cornerHeight:()=>{throw Error('Must skip');}},2)).toBe(0);
});

// Expected results are captured from the supplied executable, not the JS port.
test('height and slope retain original x86 fixture results', async()=>{
 const {readFileSync}=await import('node:fs');
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-physics-terrain.json',import.meta.url),'utf8'));
 for(const [q,height,slope] of rows){
  const input={...q,cornerHeight:(r,c,d)=>q.corners[[5,7,1,3].indexOf(d)],
   vertexHeight:(r,c)=>q.vertices[['10,10','11,10','11,9','10,9'].indexOf(`${r},${c}`)]};
  expect(originalPhysicsHeight(input)).toBe(height);
  expect(originalPhysicsSlope(input,q.direction)).toBe(slope);
 }
});
