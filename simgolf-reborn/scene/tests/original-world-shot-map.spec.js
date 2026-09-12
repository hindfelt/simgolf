import {test,expect} from '@playwright/test';
import {originalWorldShotMap} from '../src/simulation/original-world-shot-map.js';
import {originalActorTerrainEffect} from '../src/simulation/original-actor-terrain-effect.js';
import {originalTerrainMetadata} from '../src/simulation/original-terrain-metadata.js';
function world(){return {phaseCounter:1,globalFlags:0,objectBaseSizes:Int8Array.from([16,16]),terrain:new Uint8Array(2500).fill(2),heights:new Uint8Array(2601).fill(3),tileFlags:new Uint16Array(2500),metadata:Array.from({length:23},(_,i)=>originalTerrainMetadata(i)),derived:{surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000).fill(6),edgeMasks:new Uint8Array(2500)}};}
test('planning and motion bind the same terrain and object sizes from current records',()=>{
 const s=world();s.terrain[510]=1;s.tileFlags[510]=128;s.derived.edgeMasks[510]=64;s.heights[10*51+10]=7;
 const map=originalWorldShotMap(s,{planning:{terrainAt:()=>99,heightAt:()=>99,baseSizeAt:()=>99}});
 expect(map.planning.terrainAt(10,10)).toBe(1);expect(map.planning.heightAt(10,10)).toBe(7);expect(map.planning.baseSizeAt(1)).toBe(16);
 expect(map.terrainAt({x:10,z:10})).toMatchObject({code:1,flags:128,wallFlags:64,rollCoefficient:s.metadata[1].rollCoefficient});
 const p={x:10752,z:10752};
 expect(originalActorTerrainEffect({address:0x42f110,args:[p.x,p.z]},s).value).toBe(map.heightAt(p));
 expect(originalActorTerrainEffect({address:0x40c140,args:[p.x,p.z,2]},s).value).toBe(map.slopeAt(p,2));
});
test('unchecked beyond-map reads and generated-height phase stay explicit',()=>{
 const s=world(),map=originalWorldShotMap(s);
 expect(()=>map.planning.terrainAt(-1,0)).toThrow('beyond the map');
 expect(originalWorldShotMap(s,{readRawTerrain:i=>i===-50?17:20}).planning.terrainAt(-1,0)).toBe(17);
 s.phaseCounter=0;expect(()=>originalWorldShotMap(s)).toThrow('requires its generator');
});

test('stable current-world callbacks observe replacement records after a reaction',async()=>{
 const {originalCurrentWorldShotMap}=await import('../src/simulation/original-world-shot-map.js');
 let state=world();state.actors=[new Uint8Array(256)];state.profileRecords=[new Uint8Array(560)];state.holes=[new Uint8Array(520)];
 const map=originalCurrentWorldShotMap(()=>state),terrain=map.planning.terrainAt,profile=map.planning.profileIndexFor;
 expect(terrain(10,10)).toBe(2);expect(profile(0)).toBe(0);
 const before=state;state=structuredClone(state);state.terrain[510]=1;state.tileFlags[510]=128;state.heights.fill(8);
 new DataView(state.actors[0].buffer).setInt16(0xbe,7,true);new DataView(state.holes[0].buffer).setInt32(0x1fc,99,true);
 expect(terrain(10,10)).toBe(1);expect(profile(0)).toBe(7);expect(map.planning.holeRecordAt(0)).toBe(99);
 expect(map.planning.marksAt(10,10)).toBe(128);expect(map.planning.heightAt(10,10)).toBe(8);
 const fixed=originalWorldShotMap(state),p={x:10752,z:10752};
 expect(map.heightAt(p)).toBe(fixed.heightAt(p));expect(map.motion.heightAt(p.x,p.z)).toBe(fixed.motion.heightAt(p.x,p.z));
 expect(before.terrain[510]).toBe(2);expect(before.heights[510]).toBe(3);
 state.phaseCounter=0;expect(()=>terrain(10,10)).toThrow('requires its generator');
});
test('current-world reader rejects asynchronous snapshots and options',async()=>{
 const {originalCurrentWorldShotMap}=await import('../src/simulation/original-world-shot-map.js');
 expect(()=>originalCurrentWorldShotMap(()=>Promise.resolve(world()))).toThrow('snapshot must be synchronous');
 expect(()=>originalCurrentWorldShotMap(world,()=>Promise.resolve({}))).toThrow('options must be synchronous');
});

test('owned generation reuses one map and invalidates after reaction publication',async()=>{
 const {originalCurrentWorldShotMap}=await import('../src/simulation/original-world-shot-map.js');
 let state=world(),generation=0,reads=0;
 const map=originalCurrentWorldShotMap(()=>{reads++;return structuredClone(state);},()=>({}),()=>generation);
 for(let i=0;i<100;i++)expect(map.planning.terrainAt(10,10)).toBe(2);
 expect(reads).toBe(1);
 state=structuredClone(state);state.terrain[510]=1;generation++;
 expect(map.planning.terrainAt(10,10)).toBe(1);expect(map.terrainAt({x:10,z:10}).code).toBe(1);expect(reads).toBe(2);
 generation=NaN;expect(()=>map.planning.terrainAt(10,10)).toThrow('generation must be');
});
