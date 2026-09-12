import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAudibleAfterFeeCompletion} from '../src/simulation/original-audible-after-fee-completion.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-audible-complete-remark.json',import.meta.url)));
function fixture(){
 const q=structuredClone(rows.find(([q])=>q.kind===19&&q.state.actors[0][0x22]<9)[0]);
 for(const id in q.state.actors)q.state.actors[id]=Uint8Array.from(q.state.actors[id]);
 for(const field of ['profileRecords','holeRecords','profileHistory'])for(const id in q[field])q[field][id]=Uint8Array.from(q[field][id]);
 Object.assign(q.state,{holeRecords:q.holeRecords,completionProfiles:{0:new Uint8Array(44)},completionMarkers:new Uint8Array(64*76),worldDirty:0,difficulty:q.difficulty,reactionMode:0,selectedActorId:-1,globalFlags:q.globalFlags,terrain:new Uint8Array(2500).fill(2),tileFlags:new Uint16Array(2500),tileGrowth:new Uint8Array(2500),positive:new Uint8Array(2500),negative:new Uint8Array(2500)});
 new DataView(q.state.actors[0].buffer).setInt16(0xa4,q.value,true);q.clock=100;q.state.actors[0][0x84]=0;return q;
}
const options=q=>({resolvePhrase:(e,s)=>e.address===0x466fb0?{...s,sourceText:originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]})}:{...s,sourceText:'Course',remarkStyle:91},audioContext:()=>({camera:q.camera,zoom:q.zoom,map:{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]}}),playback:(e,s)=>s});
test('actual completion remark writes its message before clearing strokes',()=>{
 const q=fixture(),before=structuredClone(q),stroke=q.state.actors[0][0x22],hole=q.state.actors[0][0x21];
 const r=originalAudibleAfterFeeCompletion(q,options(q));
 expect(r.remarks).toHaveLength(1);expect(r.remarks[0].kind).toBe(19);expect(r.state.actors[0][0x22]).toBe(0);expect(r.state.completionProfiles[0][20+hole]).toBe(stroke);expect(r.state.actors[0][0x84]).toBe(7);expect(q).toEqual(before);
});
test('remapped completion remark applies actual happiness and counters to packed world',()=>{
 const q=fixture(),a=q.state.actors[0],hole=a[0x21];a[0x18]=0;a[0x22]=5;a[0x23+hole]=5;
 new DataView(q.state.holeRecords[hole].buffer).setInt32(0x28,10,true);q.state.holeRecords[hole][8]=3;
 q.state.holeRecords[hole+1]??=new Uint8Array(520);new DataView(q.state.holeRecords[hole+1].buffer).setInt32(0,4,true);
 const r=originalAudibleAfterFeeCompletion(q,options(q));expect(r.remarks[0].kind).toBe(23);expect(r.remarks[0].reaction.next).toBe('continue');
 const reaction=r.remarks[0].reaction.state,h=new DataView(r.state.holeRecords[hole].buffer);expect(h.getInt16(0x160,true)).toBe(reaction.holeTotal);expect(h.getUint16(0xe0+23*2,true)).toBe(reaction.remarkCount);expect(new DataView(r.state.actors[0].buffer).getInt16(0xa4,true)).toBe(new DataView(reaction.actor.buffer).getInt16(0xa4,true));expect(r.state.terrain).toBeInstanceOf(Uint8Array);expect(r.state.tileFlags).toBeInstanceOf(Uint16Array);
});
