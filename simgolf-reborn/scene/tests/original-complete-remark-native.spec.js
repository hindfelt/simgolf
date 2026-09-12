import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCompleteRemark} from '../src/simulation/original-complete-remark.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
import {originalRemarkWorldSnapshot,originalApplyCompleteRemarkWorld} from '../src/simulation/original-remark-world.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-complete-remark.json',import.meta.url)));
for(const [q,out] of rows){
 for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);
 for(const field of ['profileRecords','holeRecords','profileHistory'])for(const id in q[field])q[field][id]=Uint8Array.from(q[field][id]);
}
test('complete remarks match continuous original entry through explanation completion',()=>{
 for(const [q,expected] of rows){
  const before=structuredClone(q);
  const result=originalCompleteRemark(q,{
   resolvePhrase:(e,s)=>{
    if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
    return {...s,remarkStyle:91,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[0]+','+e.args[1]};
   },playSpeech:(e,s)=>s,reactionContext:()=>q.reactionContext,resolveEffect:(e,s)=>({state:s,result:0}),explanationContext:r=>({state:r.state,difficulty:q.difficulty})
  });
  expect({reactionWorld:expected.reactionWorld?Object.fromEntries(Object.keys(expected.reactionWorld).map(k=>[k,result.reaction.state[k]])):null,state:result.state,next:result.next,popupRandomDraws:result.explanation?.popupRandomDraws??0}).toEqual(expected);
  const world={...structuredClone(q.state),holeRecords:structuredClone(q.holeRecords),worldDirty:0,difficulty:q.difficulty,reactionMode:0,selectedActorId:-1,globalFlags:0,terrain:new Uint8Array(64).fill(2),tileFlags:new Uint16Array(64),tileGrowth:new Uint8Array(64),positive:new Uint8Array(64),negative:new Uint8Array(64)};
  const original=structuredClone(world),snapshot=result.reaction?.next==='continue'?originalRemarkWorldSnapshot(world,q.actorId,result.kind):null;
  const written=originalApplyCompleteRemarkWorld(world,snapshot,result);
  expect(written.seed).toBe(expected.state.seed);expect(written.actors).toEqual(expected.state.actors);
  expect(written.popupText).toBe(expected.state.popupText);expect(written.lastExplanationClock).toBe(expected.state.lastExplanationClock);
  if(snapshot){const counters=originalRemarkWorldSnapshot(written,q.actorId,result.kind).context.state;for(const key of Object.keys(expected.reactionWorld))expect(counters[key]).toBe(key==='seed'?expected.state.seed:expected.reactionWorld[key]);}
  else expect(written.holeRecords).toEqual(world.holeRecords);
  expect(written.terrain).toEqual(world.terrain);expect(world).toEqual(original);
  expect(q).toEqual(before);
 }
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(65);
 expect(rows.some(([,r])=>r.next==='return')).toBe(true);
 expect(rows.some(([,r])=>r.popupRandomDraws===2)).toBe(true);
 expect(rows.some(([,r])=>r.next==='continue'&&r.popupRandomDraws===0)).toBe(true);
});
