import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createOriginalWorld,serializeOriginalWorld,restoreOriginalWorld,originalWorldMap} from '../src/simulation/original-world-state.js';
import {originalTerrainMetadata} from '../src/simulation/original-terrain-metadata.js';
import {beginOriginalWorldShot,stepOriginalWorldShot} from '../src/simulation/original-world-launch.js';
import {originalMotionStep} from '../src/simulation/original-motion-step.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/original-assessed-launch.json',import.meta.url),'utf8'))[1][0];
function fresh(){return createOriginalWorld({terrain:new Uint8Array(2500).fill(1),marks:new Uint16Array(2500),ownership:new Uint8Array(2500),heights:new Uint8Array(2601).fill(3),
 metadata:Array.from({length:23},(_,i)=>originalTerrainMetadata(i)),rngState:17,phaseCounter:31,globalFlags:1});}
const request={id:'golfer-1',launchInput:{...fixture,x:20992,z:20992,target:{x:20,z:19},explicitTarget:true,plannerArgument:0},
 motionContext:{initialHeight:0,skillEnabled:false,skillMask:0,luck:0,targetTile:{x:20,z:19},variant:0}};
test('launch publishes cache, RNG and saved motion together and ignores stale caller RNG',()=>{
 const world=fresh(),before=serializeOriginalWorld(world);
 const first=beginOriginalWorldShot(world,request);
 expect(serializeOriginalWorld(world)).toBe(before);expect(first.world.revision).toBe(1);
 expect(first.world.rngState).toBe(first.launch.seed);expect(first.world.strengthCache).toEqual(first.launch.cache);
 expect(first.world.shots[0].ball.seed).toBe(first.world.rngState);
 expect(beginOriginalWorldShot(world,{...request,launchInput:{...request.launchInput,seed:999,globalFlags:999,stateFlags:999}})).toEqual(first);
 const restored=restoreOriginalWorld(serializeOriginalWorld(first.world));
 const step=w=>originalMotionStep({...w.shots[0],seed:w.rngState,phaseCounter:w.phaseCounter},originalWorldMap(w).motion);
 expect(step(restored)).toEqual(step(first.world));
});
test('invalid and duplicate launches leave the original world untouched',()=>{
 const world=fresh(),before=serializeOriginalWorld(world);
 expect(()=>beginOriginalWorldShot(world,{...request,motionContext:{...request.motionContext,luck:999}})).toThrow(/saved shot/);
 expect(serializeOriginalWorld(world)).toBe(before);
 const started=beginOriginalWorldShot(world,request).world,save=serializeOriginalWorld(started);
 expect(()=>beginOriginalWorldShot(started,request)).toThrow(/already active/);expect(serializeOriginalWorld(started)).toBe(save);
});

test('saved world advances a launched shot through completion with identical replay',()=>{
 let world=beginOriginalWorldShot(fresh(),request).world;
 for(let i=0;i<400;i++){
  const saved=restoreOriginalWorld(serializeOriginalWorld(world));
  const next=stepOriginalWorldShot(world,request.id);expect(stepOriginalWorldShot(saved,request.id)).toEqual(next);
  expect(next.world.phaseCounter).toBe(world.phaseCounter);
  if(next.outcome.stopped){expect(next.world.shots).toEqual([]);expect(next.outcome.ball.speed).toBe(0);return;}
  world=next.world;world.phaseCounter=(world.phaseCounter+1)>>>0;
 }
 throw Error('Launched world shot failed to settle');
});
