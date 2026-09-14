import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAudibleGolferRemark} from '../src/simulation/original-audible-golfer-remark.js';
import {originalRemarkRecordView,applyOriginalRemarkRecordView} from '../src/simulation/original-remark-record-view.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
import {originalRemarkWorldSnapshot} from '../src/simulation/original-remark-world.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-audible-complete-remark.json',import.meta.url)));
for(const [q,out] of rows){
 for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);
 for(const field of ['profileRecords','holeRecords','profileHistory'])for(const id in q[field])q[field][id]=Uint8Array.from(q[field][id]);
}
test('golfer-coordinate audible remarks match native actor, counters and final message state',()=>{
 test.setTimeout(120000);
 for(const [q,expected] of rows){
  const before=structuredClone(q);
  const world={...structuredClone(q.state),holeRecords:structuredClone(q.holeRecords),worldDirty:0,difficulty:q.difficulty,reactionMode:0,selectedActorId:-1,globalFlags:q.globalFlags,terrain:new Uint8Array(64).fill(2),tileFlags:new Uint16Array(64),tileGrowth:new Uint8Array(64),positive:new Uint8Array(64),negative:new Uint8Array(64)};
  const expanded={...world,actors:Array.from({length:152},(_,i)=>world.actors[i]||new Uint8Array(256)),holeRecords:Array.from({length:20},(_,i)=>world.holeRecords[i]||new Uint8Array(520))};
  const base={actors:Array.from({length:152},()=>new Uint8Array(256)),holes:Array.from({length:20},()=>new Uint8Array(520)),actorTail:new Uint8Array(8),holePrefix:new Uint8Array(8)};
  const golfer=applyOriginalRemarkRecordView(base,expanded),result=originalAudibleGolferRemark({...q,state:golfer},{
   resolvePhrase:(e,s)=>{
    if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
    return {...s,remarkStyle:91,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[0]+','+e.args[1]};
   },audioContext:()=>({camera:q.camera,zoom:q.zoom,map:{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]}}),playback:(e,s)=>s,reactionContext:()=>q.reactionContext,explanationContext:r=>({state:r.state,difficulty:q.difficulty})
  });
  const remarkState=originalRemarkRecordView(result.state);
  const visibleState={...remarkState,actors:Object.fromEntries(Object.keys(expected.state.actors).map(id=>[id,remarkState.actors[id]]))};
  expect({audioRandomDraws:result.audioRandomDraws,soundEvents:result.soundEvents,reactionWorld:expected.reactionWorld?Object.fromEntries(Object.keys(expected.reactionWorld).map(k=>[k,result.reaction.state[k]])):null,state:Object.fromEntries(Object.keys(expected.state).map(k=>[k,visibleState[k]])),next:result.next,popupRandomDraws:result.explanation?.popupRandomDraws??0}).toEqual(expected);
  const written=remarkState;
  if(result.reaction?.next==='continue'){
   const counters=originalRemarkWorldSnapshot(written,q.actorId,result.kind).context.state;
   for(const key of Object.keys(expected.reactionWorld))expect(counters[key]).toBe(key==='seed'?expected.state.seed:expected.reactionWorld[key]);
  }else expect(written.holeRecords).toEqual(expanded.holeRecords);
  expect(written.terrain).toEqual(world.terrain);
  expect(q).toEqual(before);
 }
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(65);
 expect(rows.some(([,r])=>r.next==='return')).toBe(true);
 expect(rows.some(([,r])=>r.popupRandomDraws===2)).toBe(true);
 expect(rows.some(([,r])=>r.next==='continue'&&r.popupRandomDraws===0)).toBe(true);
});
