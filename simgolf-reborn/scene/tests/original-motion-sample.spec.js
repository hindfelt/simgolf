import {test,expect} from '@playwright/test';
import {originalMotionSample} from '../src/simulation/original-motion-sample.js';
const q={x:21*1024,z:19*1024,cellX:20,cellZ:20,terrainCode:1,heading:0};
test('live edge sampling keeps old-cell neighbors even after crossing a tile',()=>{
 const queried=[];
 expect(originalMotionSample(q,(x,z)=>{queried.push([x,z]);return 2;})).toEqual({subX:0,subZ:0,boundaryFlags:9,direction:0});
 expect(queried).toEqual([[19,20],[20,19]]);
 expect(originalMotionSample({...q,x:q.x+14*64,z:q.z+14*64},()=>2).boundaryFlags).toBe(6);
});
test('interior samples need no neighbors and round heading through signed wraparound',()=>{
 for(const [heading,direction] of [[0,0],[0x10000000,1],[0x7fffffff,4],[0x80000000,4],[0xf0000000,0]]) {
  const sample=originalMotionSample({...q,x:q.x+512,z:q.z+512,heading},()=>{throw Error('Interior queried neighbor');});
  expect(sample).toEqual({subX:8,subZ:8,boundaryFlags:0,direction});
 }
});
