import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoPrimaryReaction} from '../src/simulation/original-auto-primary-reaction.js';
import {originalConditionClass} from '../src/simulation/original-condition-class.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-primary-reaction.json',import.meta.url),'utf8'));
const apiFor=q=>({terrainAt:()=>3,shotClassAt:code=>code===q.terrainCode?q.originClass:q.targetClass,
 holeRecordAt:()=>q.holeRecord,
 emit:(event,state)=>{
  if(q.effectCounter!==null)state.actor.elevationCounter=q.effectCounter;
  if(q.effectSeed!==null)state.seed=q.effectSeed;
  return state;
 }});
test('primary reaction priority, state and random draws match original',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);expect(originalAutoPrimaryReaction(q,apiFor(q))).toEqual(e);
  expect(JSON.stringify(q)).toBe(before);
 }
 expect(rows.some(([,e])=>e.randomDraws===0)).toBe(true);
 expect(rows.some(([,e])=>e.randomDraws>=2)).toBe(true);
});
test('first-priority reaction skips random draws and later condition lookups',()=>{
 const q=structuredClone(rows[0][0]);Object.assign(q,{mode:0,followupFlag:1,targetClass:2,originClass:0,scannedTile:123});
 q.state.actor.actorFlags=0;q.effectSeed=null;
 const api=apiFor(q);api.holeRecordAt=()=>{throw Error('Unexpected lower-priority query');};
 const result=originalAutoPrimaryReaction(q,api);
 expect(result.events).toEqual([{actorId:q.actorId,kind:8,value:20}]);
 expect(result.seed).toBe(q.state.seed);expect(result.randomDraws).toBe(0);
});
test('counter reset after a reaction observes synchronous effects',()=>{
 const [q]=rows.find(([,e])=>e.events.some(event=>[0x1f,0x25,0x26,5].includes(event.kind)));
 const low={...q,effectCounter:0,effectSeed:12345},high={...q,effectCounter:30,effectSeed:12345};
 expect(originalAutoPrimaryReaction(low,apiFor(low)).actor.elevationCounter).toBe(10);
 const result=originalAutoPrimaryReaction(high,apiFor(high));
 expect(result.actor.elevationCounter).toBe(20);expect(result.seed).toBe(12345);
});
test('condition classifier preserves all three outcomes and high-bit precedence',()=>{
 for(const low of [0,1,0x3fff]){
  expect(originalConditionClass(low)).toBe(1);
  expect(originalConditionClass(low|0x4000)).toBe(0);
  expect(originalConditionClass(low|0x8000)).toBe(2);
  expect(originalConditionClass(low|0xc000)).toBe(2);
 }
});
test('flagged-origin reaction uses actor condition and respects origin suppression',()=>{
 const q=structuredClone(rows[0][0]);Object.assign(q,{followupFlag:0,scannedTile:0,namedReference:0,originFlags:0x800});
 for(const flags of [0,0x4000,0x8000,0xc000]){
  q.state.actor.conditionFlags=flags;
  const result=originalAutoPrimaryReaction(q,apiFor(q));
  expect(result.events.some(e=>e.kind===0x18)).toBe(flags!==0x4000);
 }
 q.originFlags|=0x4000;
 expect(originalAutoPrimaryReaction(q,apiFor(q)).events.some(e=>e.kind===0x18)).toBe(false);
});
