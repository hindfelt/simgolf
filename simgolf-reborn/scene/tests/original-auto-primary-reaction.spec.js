import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoPrimaryReaction} from '../src/simulation/original-auto-primary-reaction.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-primary-reaction.json',import.meta.url),'utf8'));
const apiFor=q=>({terrainAt:()=>3,shotClassAt:code=>code===q.terrainCode?q.originClass:q.targetClass,
 featureEligible:()=>q.featureEligible,holeRecordAt:()=>q.holeRecord,
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
 const api=apiFor(q);api.featureEligible=api.holeRecordAt=()=>{throw Error('Unexpected lower-priority query');};
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
