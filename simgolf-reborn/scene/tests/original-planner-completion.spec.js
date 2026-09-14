import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalGolferEffects} from '../src/simulation/original-golfer-effects.js';
import {originalPlannerEffect} from '../src/simulation/original-planner-effect.js';
import {applyOriginalPlannerActor} from '../src/simulation/original-planner-actor.js';
import {applyOriginalPlannerResult} from '../src/simulation/original-planner-result.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
import {packedMiddleWorldRecords} from './helpers/original-packed-middle-map.js';
import {createOriginalWorld,serializeOriginalWorld,restoreOriginalWorld,originalWorldActorMap} from '../src/simulation/original-world-state.js';
import {originalTerrainMetadata} from '../src/simulation/original-terrain-metadata.js';
import {originalWorldShotMap} from '../src/simulation/original-world-shot-map.js';
const [q]=JSON.parse(readFileSync(new URL('./fixtures/original-direct-automatic-planner.json',import.meta.url)))[0];
function snapshot(){
 const s=applyOriginalPlannerActor({actorId:0,actors:[new Uint8Array(256),new Uint8Array(256)],holes:Array.from({length:20},()=>new Uint8Array(520)),metadata:Array.from({length:32},()=>({})),seed:q.state.seed,strengthCache:q.state.cache,diagnostics:0,landing:q.state.landing},q.state);
 const a=new DataView(s.actors[0].buffer),p=q.planning,h=new DataView(s.holes[q.state.actor.hole].buffer);
 for(const [offset,n] of [[8,q.position.x],[12,q.position.z],[0xdc,p.x],[0xe0,p.z]])a.setInt32(offset,n,true);
 a.setInt16(0xaa,1,true);a.setUint16(0x1e,p.abilityFlags,true);a.setInt8(0x3e,p.attitude);
 for(const [offset,n] of [[0xfa,p.driverValue],[0xfb,p.ironValue],[0xfc,p.abilityValue],[0xfd,p.drawValue],[0xfe,p.fadeValue],[0xff,p.backspinValue],[0xc2,p.rangeInput.level],[0xf8,p.rangeInput.power],[0xf9,p.rangeInput.longDrive]])a.setUint8(offset,n);
 h.setInt32(0x18,p.cup.x,true);h.setInt32(0x1c,p.cup.z,true);return s;
}
const event={address:0x4235c0,args:[0,1,-1,0,q.planning.curve]};
test('scheduler planner commits through the effect-owned world exactly once',()=>{
 const s=snapshot(),before=structuredClone(s);let completed=0;
 const effects={...middleEffects(q),complete:planner=>{completed++;return applyOriginalPlannerResult({...s,sourceText:'Retained reaction',cashTotal:1234},planner);}};
 const result=originalPlannerEffect(event,s,q,{map:{planning:middleMap(q)}},effects);
 expect(completed).toBe(1);expect(result.state.sourceText).toBe('Retained reaction');expect(result.state.cashTotal).toBe(1234);
 expect(result.state.seed).toBe(result.planner.state.seed);expect(s).toEqual(before);
 const standard=originalPlannerEffect(event,s,q,{map:{planning:middleMap(q)}},middleEffects(q));
 expect(standard.planner).toEqual(result.planner);expect(standard.state.actors).toEqual(result.state.actors);
});
test('planner rejects asynchronous completion rather than returning a promise as world state',()=>{
 expect(()=>originalPlannerEffect(event,snapshot(),q,{map:{planning:middleMap(q)}},{...middleEffects(q),complete:()=>Promise.resolve({})})).toThrow('synchronous world');
});

test('automatic planner consumes restored world terrain with packed object and actor readers',()=>{
 const controlled=middleMap(q);
 const world=createOriginalWorld({
  terrain:Uint8Array.from({length:2500},(_,i)=>controlled.terrainAt(Math.floor(i/50),i%50)),
  marks:Uint16Array.from({length:2500},(_,i)=>controlled.marksAt(Math.floor(i/50),i%50)),
  ownership:new Uint8Array(2500),heights:Uint8Array.from({length:2601},(_,i)=>8+((Math.floor(i/51)+i%51)&3)),
  metadata:Array.from({length:23},(_,i)=>({...originalTerrainMetadata(i),shape:controlled.categoryAt(i)})),
  rngState:q.state.seed,phaseCounter:31,globalFlags:0,
 });
 const saved=serializeOriginalWorld(world);
 function run(w){
  const packed=packedMiddleWorldRecords(q),s=snapshot(),{map,...terrain}=originalWorldActorMap(w);
  for(let id=0;id<s.actors.length;id++)packed.actors[id]=s.actors[id];
  const state={...packed,...s,...terrain,actors:packed.actors};
  const readers=originalWorldShotMap(state);
  const reads={terrain:0,height:0};
  for(const [name,key] of [['terrainAt','terrain'],['heightAt','height']]){
   const read=readers.planning[name];readers.planning[name]=(...args)=>{reads[key]++;return read(...args);};
  }
  const result=originalPlannerEffect(event,state,q,{map:readers},middleEffects(q));
  expect(reads.terrain).toBeGreaterThan(0);expect(reads.height).toBeGreaterThan(0);
  return result;
 }
 const first=run(world),restored=run(restoreOriginalWorld(saved));
 expect(restored).toEqual(first);
 expect(first.state.seed).toBe(first.planner.state.seed);
 expect(first.state.strengthCache).toEqual(first.planner.state.cache);
 expect(serializeOriginalWorld(world)).toBe(saved);
});

test('planner returns captured sound events without exposing the effect-owned list',()=>{
 const soundEvents=[{address:0x447a30,args:[1,2,3]}];
 const effects={...middleEffects(q),readSoundEvents:()=>soundEvents};
 const result=originalPlannerEffect(event,snapshot(),q,{map:{planning:middleMap(q)}},effects);
 expect(result.soundEvents).toEqual(soundEvents);
 result.soundEvents[0].args[0]=99;expect(soundEvents[0].args[0]).toBe(1);
 expect(()=>originalPlannerEffect(event,snapshot(),q,{map:{planning:middleMap(q)}},
  {...middleEffects(q),readSoundEvents:()=>Promise.resolve([])})).toThrow('synchronous');
});

test('scheduler dispatcher drains planner sounds in invocation order only once',()=>{
 let call=0;
 const dispatch=originalGolferEffects(undefined,()=>({context:q,dependencies:{map:{planning:middleMap(q)}},
  effects:{...middleEffects(q),readSoundEvents:()=>[{address:0x447a30,args:[++call]}]}}));
 const a=dispatch(event,snapshot()),b=dispatch(event,snapshot());
 a.soundEvents[0].args[0]=999;
 expect(dispatch.drainSoundEvents()).toEqual([{address:0x447a30,args:[1]},{address:0x447a30,args:[2]}]);
 expect(dispatch.drainSoundEvents()).toEqual([]);
 expect(a.state.seed).toBe(b.state.seed);
});
