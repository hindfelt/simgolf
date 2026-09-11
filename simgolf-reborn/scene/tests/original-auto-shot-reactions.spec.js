import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoShotReactions} from '../src/simulation/original-auto-shot-reactions.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-shot-reactions.json',import.meta.url),'utf8'));
const apiFor=q=>({shotClassAt:()=>q.shotClass,courseMarkAt:()=>q.courseMark,
 scoreFor:id=>id===q.actorId?q.ownScore:q.otherScore,
 emit:(event,state)=>{
  const actor=event.actorId===q.actorId?state.actor:state.partner;
  if(q.effect==='marker'&&event.actorId===q.actorId)actor.marker=(actor.marker+1)&255;
  if(q.effect==='reaction')actor.reaction=1;
  return state;
 }});
test('shot reaction state and request order match original executable',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);expect(originalAutoShotReactions(q,apiFor(q))).toEqual(e);
  expect(JSON.stringify(q)).toBe(before);
 }
 expect(rows.some(([,e])=>e.events.some(event=>event.kind===0x30))).toBe(true);
 expect(rows.some(([,e])=>e.events.some(event=>event.kind===0x31))).toBe(true);
});
test('paired reactions execute in order and persist the partner counter',()=>{
 const [q]=rows.find(([,e])=>e.events.some(event=>event.kind===0x30));
 const result=originalAutoShotReactions(q,apiFor(q));
 expect(result.events.slice(-2)).toEqual([{actorId:q.actorId,kind:0x30,value:20},{actorId:q.actorId^1,kind:0x31,value:20}]);
 expect(result.state.partner.reaction).toBe(1);
 expect(q.state.partner.reaction).toBe(0);
});
test('stale marker clears old curve flags without making reaction queries',()=>{
 const q=structuredClone(rows[0][0]);q.previousMarker=(q.state.actor.marker+1)&255;
 q.state.actor.actorFlags=0xffffffff;
 const fail=()=>{throw Error('Unexpected reaction query');};
 const result=originalAutoShotReactions(q,{emit:fail,shotClassAt:fail,courseMarkAt:fail,scoreFor:fail});
 expect(result.events).toEqual([]);expect(result.state.actor.actorFlags).toBe(0xffffff9f);
});
