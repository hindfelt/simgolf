import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAudibleRemarkAdjustment} from '../src/simulation/original-remark-adjustment.js';
import {originalRemarkWorldSnapshot,originalApplyRemarkWorld} from '../src/simulation/original-remark-world.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-audible-remark.json',import.meta.url)));
function context(q){return ()=>({camera:q.camera,zoom:q.zoom,map:{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]}});}
function input(row){const q=structuredClone(row);q.state.actor=Uint8Array.from(q.state.actor);q.before=Uint8Array.from(q.before);return q;}
test('reaction selection, real projection/speech and outcome share exact original state and RNG',()=>{
 for(const [row,expected] of rows){
  const q=input(row),before=structuredClone(q);
  const got=originalAudibleRemarkAdjustment(q,context(q),(_event,state)=>{
   if(q.effectMutation){state.actor[0x18]=0x40;state.seed=777;}return state;
  });
  got.state.actor=[...got.state.actor];expect(got).toEqual(expected);expect(q).toEqual(before);
 }
});
test('only actual playback is delegated; the caller cannot substitute projection or RNG outcomes',()=>{
 const [row]=rows.find(([,r])=>r.soundEvents.length>0),q=input(row);let count=0;
 originalAudibleRemarkAdjustment(q,context(q),(event,state)=>{expect(event.address).toBe(0x447a30);count++;return state;});
 expect(count).toBeGreaterThan(0);
 expect(()=>originalAudibleRemarkAdjustment(q,context(q))).toThrow('requires an explicit resolver');
 expect(()=>originalAudibleRemarkAdjustment(q,context(q),async(_event,state)=>state)).toThrow('synchronous');
});
test('positional playback finishes before the outcome reads its current hole and tile',()=>{
 const [row]=rows.find(([q,r])=>q.kind===20&&r.soundEvents.length>0),q=input(row);
 const holes={1:new Uint8Array(520),2:new Uint8Array(520)};new DataView(holes[2].buffer).setInt16(0x160,9,true);
 const world={actors:{[q.actorId]:q.state.actor},holeRecords:holes,terrain:new Uint8Array(64).fill(2),tileFlags:new Uint16Array(64),tileGrowth:new Uint8Array(64),positive:new Uint8Array(64),negative:new Uint8Array(64),seed:q.state.seed,worldDirty:0,difficulty:1,reactionMode:2,globalFlags:0,selectedActorId:-1};
 let played=0,reads=0,snapshot;
 const result=originalAudibleRemarkAdjustment(q,context(q),(event,s)=>{
  played++;s.actor[0x21]=2;const actor=new DataView(s.actor.buffer);actor.setInt32(0,1024,true);actor.setInt32(4,4096,true);actor.setUint32(0x10,actor.getUint32(0x10,true)|0x20000000,true);s.seed=999;return s;
 },s=>{
  expect(played).toBeGreaterThan(0);expect(s.queued).toBe(0);expect(s.actor[0x1d]).toBe(14);reads++;
  snapshot=originalRemarkWorldSnapshot({...world,seed:s.seed,actors:{[q.actorId]:s.actor}},q.actorId,q.kind);return snapshot.context;
 });
 expect(reads).toBe(1);expect(snapshot.tileIndex).toBe(54);expect(result.state.holeTotal).toBe(8);
 const written=originalApplyRemarkWorld(world,snapshot,result);
 expect(written.holeRecords[1]).toEqual(world.holeRecords[1]);expect(written.negative[53]).toBe(0);expect(written.negative[54]).toBe(1);
 expect(written.seed).toBe((Math.imul(999,0x41c64e6d)+0x3039)>>>0);
});
test('audible early returns skip outcome reads and reject asynchronous continuing reads',()=>{
 const [row]=rows.find(([q,r])=>q.kind===20&&r.soundEvents.length>0),q=input(row);
 expect(originalAudibleRemarkAdjustment({...q,kind:48},context(q),undefined,()=>{throw Error('Unexpected read');}).next).toBe('return');
 expect(()=>originalAudibleRemarkAdjustment(q,context(q),(e,s)=>s,async()=>({state:q.state}))).toThrow('synchronous');
});
