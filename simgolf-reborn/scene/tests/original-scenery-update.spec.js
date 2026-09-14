import {test,expect} from '@playwright/test';
import {originalSceneryUpdate} from '../src/simulation/original-scenery-update.js';
function fresh(){const actor=new Uint8Array(256),a=new DataView(actor.buffer);a.setInt32(8,20480,true);a.setInt32(12,25600,true);
 const building=new Uint8Array(16),b=new DataView(building.buffer);b.setInt16(0,4,true);b.setInt32(8,16,true);
 return {actorId:0,actors:[actor],phaseCounter:0,seed:17,terrain:new Uint8Array(2500).fill(22),tileFlags:new Uint16Array(2500).fill(0x1000),buildings:[building]};}
test('building and marked terrain reactions preserve order and reread changed tile flags',()=>{
 const q=fresh(),before=structuredClone(q);
 const run=s=>originalSceneryUpdate(s,(event,state)=>{
  if(event.address===0x466ea0)state.tileFlags.fill(0x800);
  return {state,result:0};
 });
 const r=run(q);expect(r.calls.map(e=>e.address)).toEqual([0x40dc70,0x4672d0,0x466ea0,0x4672d0]);
 expect(r.calls[1].args).toEqual([0,20,r.sample.remarkIndex]);expect(r.calls[3].args).toEqual([0,20,r.sample.remarkIndex]);
 expect(r.sample.index).toBe(r.sample.x*50+r.sample.z);expect(r.sample.remarkIndex).toBe(r.sample.z*50+r.sample.x);
 expect(r.randomDraws).toBe(1);expect(q).toEqual(before);expect(run(structuredClone(q))).toEqual(r);
});
test('cadence and recent remark suppress sampling without spending RNG',()=>{
 const q=fresh();expect(originalSceneryUpdate({...q,phaseCounter:1}).randomDraws).toBe(0);
 q.actors[0][0x78]=139;const r=originalSceneryUpdate(q);
 expect(r.calls).toEqual([]);expect(r.sample).toBeNull();expect(r.state.seed).toBe(17);
});
test('building lookup and reactions require explicit synchronous state',()=>{
 const q=fresh();expect(()=>originalSceneryUpdate(q)).toThrow(/explicit resolver/);
 expect(()=>originalSceneryUpdate(q,async(_,state)=>({state,result:0}))).toThrow(/synchronous/);
 expect(q.seed).toBe(17);
});
