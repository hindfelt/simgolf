import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoShotReactions} from '../src/simulation/original-auto-shot-reactions.js';
import {originalProfileGroup} from '../src/simulation/original-profile-group.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-shot-reactions.json',import.meta.url),'utf8'));
const apiFor=q=>({shotClassAt:()=>q.shotClass,profileHoleMarkAt:()=>q.profileHoleMark,
 profileIndexFor:id=>id===q.actorId?q.state.actor.profileIndex:q.otherProfileIndex,profileByteAt:index=>q.profileBytes[index],
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
 const result=originalAutoShotReactions(q,{emit:fail,shotClassAt:fail,profileHoleMarkAt:fail,profileIndexFor:fail,profileByteAt:fail});
 expect(result.events).toEqual([]);expect(result.state.actor.actorFlags).toBe(0xffffff9f);
});
test('profile classification uses the high bit, not byte equality',()=>{
 for(let value=0;value<256;value++)expect(originalProfileGroup(3,{
  profileIndexFor:id=>{expect(id).toBe(3);return 76;},
  profileByteAt:index=>{expect(index).toBe(76);return value;}
 })).toBe(value<128?1:0);
});
test('paired remarks require matching profile groups',()=>{
 const q=structuredClone(rows.find(([,e])=>e.events.some(event=>event.kind===0x30))[0]);
 q.state.actor.profileIndex=0;q.otherProfileIndex=1;
 q.profileBytes=[12,100];
 expect(originalAutoShotReactions(q,apiFor(q)).events.some(e=>e.kind===0x30)).toBe(true);
 q.profileBytes[1]=128;
 expect(originalAutoShotReactions(q,apiFor(q)).events.some(e=>e.kind===0x30)).toBe(false);
});
