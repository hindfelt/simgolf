import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAudiblePlannerBinding} from '../src/simulation/original-audible-planner-binding.js';
import {originalTerrainMetadata} from '../src/simulation/original-terrain-metadata.js';
import {originalPlannerActor} from '../src/simulation/original-planner-actor.js';
import {originalRemarkRecordView,applyOriginalRemarkRecordView} from '../src/simulation/original-remark-record-view.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-audible-complete-remark.json',import.meta.url)));
for(const [q,out] of rows){
 for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);
 for(const field of ['profileRecords','holeRecords','profileHistory'])for(const id in q[field])q[field][id]=Uint8Array.from(q[field][id]);
}
test('planner audible callbacks retain native actor and message state',()=>{
 test.setTimeout(120000);
 for(const [q,expected] of rows){
  const before=structuredClone(q);
  const world={...structuredClone(q.state),holeRecords:structuredClone(q.holeRecords),worldDirty:0,difficulty:q.difficulty,reactionMode:0,selectedActorId:-1,globalFlags:q.globalFlags,phaseCounter:1,heights:new Uint8Array(2601),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)},terrain:new Uint8Array(2500).fill(2),tileFlags:new Uint16Array(2500),tileGrowth:new Uint8Array(64),positive:new Uint8Array(64),negative:new Uint8Array(64)};
  const expanded={...world,actors:Array.from({length:152},(_,i)=>world.actors[i]||new Uint8Array(256)),holeRecords:Array.from({length:20},(_,i)=>world.holeRecords[i]||new Uint8Array(520))};
  const base={actors:Array.from({length:152},()=>new Uint8Array(256)),holes:Array.from({length:20},()=>new Uint8Array(520)),actorTail:new Uint8Array(8),holePrefix:new Uint8Array(8)};
  const golfer=applyOriginalRemarkRecordView(base,expanded);golfer.actorId=q.actorId;golfer.metadata=Array.from({length:23},(_,i)=>originalTerrainMetadata(i));const av=new DataView(golfer.actors[q.actorId].buffer),partner=golfer.actors[av.getInt16(0xaa,true)],holeId=golfer.actors[q.actorId][0x29];const partial={actor:originalPlannerActor(golfer),partner:{actorClass:partner[0x20],reaction:partner[0x8c]},seed:golfer.seed,diagnostics:0,holeCounter:new DataView(golfer.holes[holeId].buffer).getInt32(0x24,true),speed:av.getInt32(0xec,true),verticalSpeed:av.getInt32(0xf0,true),heading:av.getUint32(0xe8,true),cache:{next:0,entries:Array.from({length:10},()=>({distance:0,verticalSpeed:0,speed:0}))}};const binding=originalAudiblePlannerBinding(golfer,{context:{},dependencies:{},remarkFor:()=>({request:q,options:{
   resolvePhrase:(e,s)=>{
    if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
    return {...s,remarkStyle:91,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[0]+','+e.args[1]};
   },audioContext:()=>({camera:q.camera,zoom:q.zoom,map:{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]}}),playback:(e,s)=>s,reactionContext:()=>q.reactionContext,explanationContext:r=>({state:r.state,difficulty:q.difficulty})
  }})});const effects=binding.effects;
  const reread=effects.emit({actorId:q.actorId,kind:q.kind,value:q.value},partial),result={state:effects.readWorld()};
  expect(reread.actor).toEqual(originalPlannerActor(result.state));expect(reread.seed).toBe(expected.state.seed);
  expect(binding.dependencies.map.planning.profileIndexFor(q.actorId)).toBe(new DataView(result.state.actors[q.actorId].buffer).getInt16(0xbe,true));
  const remarkState=originalRemarkRecordView(result.state);
  const visibleState={...remarkState,actors:Object.fromEntries(Object.keys(expected.state.actors).map(id=>[id,remarkState.actors[id]]))};
  expect(Object.fromEntries(Object.keys(expected.state).map(k=>[k,visibleState[k]]))).toEqual(expected.state);
  const written=remarkState;
  expect(written.terrain).toEqual(world.terrain);
  const completed=effects.complete({state:{...reread,landing:{x:0,z:0}},shotClassOverrides:[]});
  expect(completed.actors).toEqual(result.state.actors);
  expect(completed.holes).toEqual(result.state.holes);
  expect(completed.seed).toBe(expected.state.seed);
  expect(originalRemarkRecordView(completed).message).toEqual(expected.state.message);
  expect(effects.readWorld()).toEqual(result.state);
  if(q===rows[0][0]){
   // A subsequent reaction observes a changed current hole. Final write-back
   // must still address the hole captured when this planner invocation began.
   const changedHole=(holeId+1)%20;
   const next=effects.emit({actorId:q.actorId,kind:q.kind,value:q.value},{...reread,actor:{...reread.actor,hole:changedHole}});
   const current=effects.readWorld();
   expect(current.actors[q.actorId][0x29]).toBe(changedHole);
   const changedCounter=new DataView(current.holes[changedHole].buffer).getInt32(0x24,true);
   const finished=effects.complete({state:{...next,holeCounter:12345,landing:{x:0,z:0}},shotClassOverrides:[]});
   expect(new DataView(finished.holes[holeId].buffer).getInt32(0x24,true)).toBe(12345);
   expect(new DataView(finished.holes[changedHole].buffer).getInt32(0x24,true)).toBe(changedCounter);
   expect(finished.actors).toEqual(current.actors);
  }
  expect(q).toEqual(before);
 }
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(65);
 expect(rows.some(([,r])=>r.next==='return')).toBe(true);
 expect(rows.some(([,r])=>r.popupRandomDraws===2)).toBe(true);
 expect(rows.some(([,r])=>r.next==='continue'&&r.popupRandomDraws===0)).toBe(true);
});
