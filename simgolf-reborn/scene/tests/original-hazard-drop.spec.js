import {test,expect} from '@playwright/test';
import {originalHazardDrop} from '../src/simulation/original-hazard-drop.js';
function fresh(code=17){const b=new Uint8Array(256),a=new DataView(b.buffer);b[0x29]=1;b[0x2a]=7;b[0x22]=2;a.setInt32(0xcc,5120,true);a.setInt32(0xd0,5120,true);a.setInt32(0xdc,10240,true);a.setInt32(0xe0,5120,true);a.setInt32(12,6000,true);const terrain=new Uint8Array(2500).fill(1);terrain[505]=code;const metadata=Array.from({length:21},()=>({scatterCoefficient:0}));return {actorId:0,actors:[b],landingTerrain:code,landingTile:{x:10,z:5},centreFlag:0,terrain,metadata,holeTargets:[null,{x:45,z:45}],seed:17};}
test('hazard search chooses the final eligible half-tile candidate and applies one penalty',()=>{
 const q=fresh(),before=structuredClone(q),r=originalHazardDrop(q,(_,state)=>({state})),a=new DataView(r.state.actors[0].buffer);
 expect(r.candidates).toBe(10);expect(a.getInt32(0xdc,true)).toBe(9728);expect(a.getInt32(0xe0,true)).toBe(5120);expect(r.state.actors[0][0x2a]).toBe(8);expect(a.getInt16(0xa6,true)).toBe(-99);expect(r.calls).toEqual([{address:0x40c1f0,args:[5,10240,6000,0]},{address:0x4672d0,args:[0,13,17]}]);expect(q).toEqual(before);expect(r.state.seed).toBe(17);
});
test('invalid tile without centre flag returns to the previous origin after reaction',()=>{
 const q=fresh(20);const r=originalHazardDrop(q,(_,state)=>{new DataView(state.actors[0].buffer).setInt32(0xcc,6000,true);return {state};});
 expect(r.candidates).toBe(0);expect(r.calls).toEqual([{address:0x4672d0,args:[0,2,20]}]);expect(new DataView(r.state.actors[0].buffer).getInt32(0xdc,true)).toBe(6000);
});
test('ordinary valid ground has no penalty and unresolved effects fail atomically',()=>{
 const q=fresh(1),r=originalHazardDrop(q);expect(r.penalty).toBe(false);expect(r.state).toEqual(q);expect(r.calls).toEqual([]);
 const hazard=fresh(),before=structuredClone(hazard);expect(()=>originalHazardDrop(hazard)).toThrow('explicit resolver');expect(hazard).toEqual(before);
});
test('unavailable drop ground falls back to origin and native signed stroke limit is retained',()=>{
 for(const [strokes,expected] of [[8,8],[255,0]]){
  const q=fresh();q.terrain.fill(17);q.actors[0][0x2a]=strokes;const r=originalHazardDrop(q,(_,state)=>({state}));expect(new DataView(r.state.actors[0].buffer).getInt32(0xdc,true)).toBe(5120);expect(r.state.actors[0][0x2a]).toBe(expected);
 }
});
