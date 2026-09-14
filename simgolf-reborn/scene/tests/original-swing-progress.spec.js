import {test,expect} from '@playwright/test';
import {originalSwingProgress} from '../src/simulation/original-swing-progress.js';
function fresh(phase=7){const b=new Uint8Array(256),a=new DataView(b.buffer);b[0x28]=phase;b[0x22]=0;b[0x26]=9;b[0x21]=7;a.setInt32(8,20000,true);a.setInt32(12,25000,true);a.setInt32(0x10,-1,true);a.setInt32(0xcc,21000,true);a.setInt32(0xd0,26000,true);return {actorId:0,actors:[b],ballTerrain:1,selectedActor:0,seed:17};}
test('impact emits putt contact once and advances motion with immutable input',()=>{
 const q=fresh(),before=structuredClone(q);const r=originalSwingProgress(q,(_,state)=>({state}));expect(r.calls).toEqual([{address:0x40c1f0,args:[3,20000,25000,0]}]);expect(r.next).toBe('motion');expect(q).toEqual(before);
 const next=originalSwingProgress(r.state);expect(next.calls).toEqual([]);expect(next.state.seed).toBe(17);
});
test('swing start rotates stance except the special club and waits before impact',()=>{
 const q=fresh(2),r=originalSwingProgress(q);expect(r.next).toBe('skip');expect(r.state.actors[0][0x22]).toBe(2);expect(r.state.actors[0][0x26]).toBe(0);
 q.actors[0][0x24]=13;expect(originalSwingProgress(q).state.actors[0][0x22]).toBe(0);
});
test('phase 32 resets flagged swing and uses the smaller putting stance',()=>{
 for(const [terrain,x] of [[1,20808],[2,20616]]){
  const q=fresh(31);q.ballTerrain=terrain;new DataView(q.actors[0].buffer).setUint32(0x18,0x4000,true);
  const r=originalSwingProgress(q);expect(r.state.actors[0][0x28]).toBe(0);expect(new DataView(r.state.actors[0].buffer).getInt32(8,true)).toBe(x);expect(r.next).toBe('motion');
 }
});
test('impact rereads club changes made by the remark callback before choosing sound',()=>{
 const q=fresh();q.ballTerrain=3;new DataView(q.actors[0].buffer).setUint32(0x18,0x400000,true);
 const r=originalSwingProgress(q,(e,state)=>{if(e.address===0x4672d0)state.actors[0][0x24]=12;return {state};});
 expect(r.calls.map(e=>e.address)).toEqual([0x4672d0,0x40c1f0]);expect(r.calls[1].args[0]).toBe(2);expect(r.state.actors[0][0x8c]).toBe(3);
});
test('signed phase wrap preserves native behavior and unresolved impact requires a resolver',()=>{
 const q=fresh(127);expect(originalSwingProgress(q).state.actors[0][0x28]).toBe(128);expect(originalSwingProgress(q).next).toBe('skip');
 expect(()=>originalSwingProgress(fresh())).toThrow('explicit resolver');
});
