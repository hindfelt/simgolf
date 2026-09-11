import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalShotMap} from '../src/simulation/original-shot-map.js';
import {originalTerrainMetadata} from '../src/simulation/original-terrain-metadata.js';
import {originalDirectionalHeightStage} from '../src/simulation/original-corner-height.js';
import {originalCandidateStart,originalCandidateStep} from '../src/simulation/original-candidate-step.js';
const empty=()=>({surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000),edgeMasks:new Uint8Array(2500)});
test('shared map separates placement flags, terrain metadata and derived walls',()=>{
 const terrain=new Uint8Array(2500).fill(2),marks=new Uint16Array(2500),derived=empty();
 terrain[510]=13;marks[510]=0x120;derived.edgeMasks[510]=64;
 const map=originalShotMap({terrain,marks,derived,readHeight:()=>3,metadata:originalTerrainMetadata,globalFlags:0});
 const actual=map.terrainAt({x:10,z:10}),metadata=originalTerrainMetadata(13);
 expect(actual.flags).toBe(0x120);expect(actual.wallFlags).toBe(64);expect(actual.metadataFlags).toBe(metadata.flags);
 expect(map.kindAt({x:10,z:10})).toBe(metadata.kind);expect(map.shotClassAt(13)).toBe(metadata.shotClass);
 expect(map.terrainAt({x:-1,z:10}).code).toBe(20);
});
test('nonzero cached map heights and slopes match original executable sample fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-physics-terrain.json',import.meta.url),'utf8'));
 for(const [q,height,slope] of rows){
  const derived=empty();for(const [i,d] of [5,7,1,3].entries())derived.directionHeights[510*8+d]=q.corners[i];
  const readHeight=(r,c)=>q.vertices[['10,10','11,10','11,9','10,9'].indexOf(`${r},${c}`)];
  const map=originalShotMap({terrain:new Uint8Array(2500).fill(q.terrainCode),marks:new Uint16Array(2500),derived,readHeight,
   metadata:()=>({flags:q.metadataFlags}),globalFlags:q.globalFlags});
  // Original zero cache entries intentionally fall through to raw corner reads.
  if(q.corners.includes(0))continue;
  expect(map.heightAt(q)).toBe(height);expect(map.slopeAt(q,q.direction)).toBe(slope);
 }
});
test('shared map adapter preserves full nonflat original candidate trajectories',()=>{
 const {world,rows}=JSON.parse(readFileSync(new URL('./fixtures/original-candidate-nonflat.json',import.meta.url),'utf8'));
 const readHeight=(r,c)=>world.heights[r*51+c];
 const derived={...originalDirectionalHeightStage({readHeight,readMetadataFlags:()=>0}),edgeMasks:new Uint8Array(world.walls)};
 const map=originalShotMap({terrain:new Uint8Array(world.grid),marks:new Uint16Array(world.marks),derived,readHeight,
  metadata:code=>({...world.metadata[code],flags:0}),globalFlags:0});
 for(const [launch,mode,variant,expected] of rows){
  let a=originalCandidateStart(launch);
  for(let i=0;i<2000&&a.speed!==0;i++)a=originalCandidateStep(a,{...map,mode,variant});
  expect(a.speed).toBe(0);expect({x:a.x,z:a.z,seed:a.seed,steps:a.steps,landing:a.landing}).toEqual(expected);
 }
});

test('zero cached corners fall back to original vertex reads',()=>{
 const map=originalShotMap({terrain:new Uint8Array(2500).fill(2),marks:new Uint16Array(2500),derived:empty(),
  readHeight:()=>6,metadata:()=>({flags:0}),globalFlags:0});
 expect(map.heightAt({x:10500,z:10500})).toBe(48);
 expect(map.slopeAt({x:10500,z:10500},2)).toBe(0);
});
