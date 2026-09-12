import {test,expect} from '@playwright/test';
import {createOriginalWorld,serializeOriginalWorld,restoreOriginalWorld,originalWorldMap} from '../src/simulation/original-world-state.js';
import {originalMotionStep} from '../src/simulation/original-motion-step.js';
import {originalTerrainMetadata} from '../src/simulation/original-terrain-metadata.js';
function fresh(){return createOriginalWorld({terrain:new Uint8Array(2500).fill(1),marks:new Uint16Array(2500),ownership:new Uint8Array(2500),heights:new Uint8Array(2601).fill(3),
 metadata:Array.from({length:23},(_,i)=>originalTerrainMetadata(i)),rngState:17,phaseCounter:31,globalFlags:0});}
test('original-format world preserves active motion, RNG, metadata and planning cache after reload',()=>{
 const world=fresh();
 world.metadata[1].rollCoefficient=3;world.strengthCache.next=1;world.strengthCache.entries[0]={distance:20,verticalSpeed:0,speed:1300};
 world.shots.push({id:'golfer-1',ball:{x:20992,z:20992,height:100,speed:1000,verticalSpeed:-64,heading:0,angularOffset:0,seed:17},originTerrainCode:1,
  club:13,eventFlag:false,centreFlag:0,stateFlags:0,skillEnabled:false,skillMask:0,luck:0,targetTile:{x:20,z:20},variant:0});
 const restored=restoreOriginalWorld(serializeOriginalWorld(world));expect(restored).toEqual(world);
 const advance=w=>originalMotionStep({...w.shots[0],phaseCounter:w.phaseCounter,seed:w.rngState},originalWorldMap(w).motion);
 expect(advance(restored)).toEqual(advance(world));
 restored.metadata[1].rollCoefficient=2;expect(world.metadata[1].rollCoefficient).toBe(3);
});
test('legacy formats and implicit scale changes are rejected',()=>{
 expect(()=>restoreOriginalWorld(JSON.stringify({version:79,tiles:{}}))).toThrow(/legacy courses/);
 const w=fresh();w.geometry.yardsPerCell=8;expect(()=>serializeOriginalWorld(w)).toThrow(/rescaled/);
});
test('malformed original maps cannot silently wrap terrain or truncate height arrays',()=>{
 const w=fresh();w.terrain[0]=256;expect(()=>serializeOriginalWorld(w)).toThrow(/terrain/);
 w.terrain[0]=1;w.heights.pop();expect(()=>serializeOriginalWorld(w)).toThrow(/heights/);
});
