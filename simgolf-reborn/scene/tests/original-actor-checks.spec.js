import {test,expect} from '@playwright/test';
import {originalActorChecks} from '../src/simulation/original-actor-checks.js';
function fresh(){const bytes=new Uint8Array(256),a=new DataView(bytes.buffer);
 a.setInt32(8,20480,true);a.setInt32(12,25600,true);a.setInt32(0x10,200,true);a.setInt32(0x14,200,true);a.setInt16(0xba,4,true);bytes[0x8c]=2;bytes[0x8d]=50;
 return {actorId:0,actors:[bytes],seed:17,phaseCounter:0,difficulty:-1,focusActor:-1,visualOwners:Array(16).fill(-1),lastPairClock:0,modeByte:0,detailLevel:4,terrain:new Uint8Array(2500).fill(1),tileFlags:new Uint16Array(2500),trackedX:-1,trackedZ:-1,trackedFacing:0};}
test('countdown callback writes flow into scenery suppression and tracked actor fields',()=>{
 const q=fresh(),before=structuredClone(q);
 const run=s=>originalActorChecks(s,(_,state)=>{
  const bytes=state.actors[0].slice(),a=new DataView(bytes.buffer);state.actors[0]=bytes;
  bytes[0x8c]=6;bytes[0x78]=139;bytes[0x22]=3;a.setUint32(0x18,0x200,true);a.setInt32(8,24000,true);
  return {state,result:0};
 });
 const result=run(q);
 expect(result.calls).toEqual([{address:0x466ea0,args:[0]}]);expect(result.randomDraws).toBe(1);expect(result.sample).toBeNull();
 expect(result.state.focusActor).toBe(0);expect(result.state.trackedX).toBe(24000);expect(result.state.trackedFacing).toBe(3);
 expect(result.state.actors[0][0x78]).toBe(139);expect(q).toEqual(before);expect(run(structuredClone(q))).toEqual(result);
});
test('assembled actor update keeps untracked camera values and rejects incomplete effects',()=>{
 const q=fresh();q.actors[0][0x8c]=0;
 expect(originalActorChecks(q).state.trackedX).toBe(-1);
 q.actors[0][0x8c]=2;expect(()=>originalActorChecks(q)).toThrow(/explicit effect resolver/);
 expect(()=>originalActorChecks(q,async(_,state)=>({state,result:0}))).toThrow(/synchronous/);
 expect(q.actors[0][0x8c]).toBe(2);
});
