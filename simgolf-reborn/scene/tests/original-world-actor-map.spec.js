import {test,expect} from '@playwright/test';
import {createOriginalWorld,originalWorldActorMap,serializeOriginalWorld,restoreOriginalWorld} from '../src/simulation/original-world-state.js';
import {originalTerrainMetadata} from '../src/simulation/original-terrain-metadata.js';
import {originalActorMotionContext} from '../src/simulation/original-actor-motion-context.js';
import {originalGolferEffects} from '../src/simulation/original-golfer-effects.js';
import {originalWorldShotMap} from '../src/simulation/original-world-shot-map.js';
import {originalActorBallMotion} from '../src/simulation/original-actor-ball-motion.js';
function fresh(){return createOriginalWorld({terrain:new Uint8Array(2500).fill(1),marks:new Uint16Array(2500),ownership:new Uint8Array(2500),heights:new Uint8Array(2601).fill(3),metadata:Array.from({length:23},(_,i)=>originalTerrainMetadata(i)),rngState:17,phaseCounter:31,globalFlags:0});}
function advance(world){const {map,...fields}=originalWorldActorMap(world),actors=Array.from({length:152},()=>new Uint8Array(256)),a=new DataView(actors[0].buffer);a.setInt32(0xdc,20992,true);a.setInt32(0xe0,20992,true);a.setInt32(0xe4,300,true);a.setInt32(0xec,160,true);const state=originalActorMotionContext({...fields,actors,actorId:0,visualSlot:-1,variant:0,luck:0,difficulty:0});return originalActorBallMotion(state,originalGolferEffects((e,state)=>({state,value:0})));}
test('saved original terrain supplies actor movement with matching restored results',()=>{const w=fresh(),before=serializeOriginalWorld(w);const first=advance(w),second=advance(restoreOriginalWorld(before));expect(first).toEqual(second);expect(first.next).toBe('0x4295ef');expect(new DataView(first.state.actors[0].buffer).getInt32(0xe0,true)).toBe(20982);expect(serializeOriginalWorld(w)).toBe(before);});
test('actor metadata preserves saved runtime values and the shared byte-2 meaning',()=>{const w=fresh();w.metadata[1].shotClass=7;w.metadata[1].rollCoefficient=-1;const a=originalWorldActorMap(w);expect(a.metadata[1].scatterCoefficient).toBe(7);expect(a.metadata[1].shotClass).toBe(7);expect(a.metadata[1].rollCoefficient).toBe(-1);a.metadata[1].shotClass=3;expect(w.metadata[1].shotClass).toBe(7);});

test('restored world exposes consistent height and derived backing for current map readers',()=>{
 const w=fresh();w.heights[20*51+20]=7;
 const saved=serializeOriginalWorld(w),fields=originalWorldActorMap(restoreOriginalWorld(saved)),bound=originalWorldShotMap(fields);
 expect(fields.heights).toBeInstanceOf(Uint8Array);expect(fields.derived.edgeMasks).toBe(fields.edgeMasks);
 expect(bound.planning.heightAt(20,20)).toBe(7);
 for(const p of [{x:20992,z:20992},{x:21500,z:20500}]){
  expect(bound.heightAt(p)).toBe(fields.map.heightAt(p));
  for(let d=0;d<8;d++)expect(bound.slopeAt(p,d)).toBe(fields.map.slopeAt(p,d));
 }
 fields.heights[20*51+20]=1;fields.derived.edgeMasks[0]=255;
 expect(serializeOriginalWorld(w)).toBe(saved);
});
