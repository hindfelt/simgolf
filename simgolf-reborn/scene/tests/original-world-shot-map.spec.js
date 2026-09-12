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
