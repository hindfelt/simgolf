import {test,expect} from '@playwright/test';
import {originalActorDispatch} from '../src/simulation/original-actor-dispatch.js';
function fresh(){const bytes=new Uint8Array(256),a=new DataView(bytes.buffer);a.setInt32(8,20480,true);a.setInt32(12,25600,true);a.setInt32(0xdc,10240,true);a.setInt32(0xe0,10240,true);a.setInt16(0xb0,15,true);bytes[0x29]=1;bytes[0x78]=11;
 return {actorId:0,actors:[bytes],seed:17,phaseCounter:0,difficulty:5,focusActor:-1,visualOwners:Array(16).fill(-1),lastPairClock:0,modeByte:0,detailLevel:4,environmentByte:0,conditionRange:20,metadata:[{}, {shape:1}],terrain:new Uint8Array(2500).fill(1),tileFlags:new Uint16Array(2500)};}
test('ball terrain precedes condition reactions while actor terrain follows them at the original tile',()=>{
 const q=fresh(),before=structuredClone(q);
 const r=originalActorDispatch(q,(e,state)=>{
  expect(e.args).toEqual([0,14,20]);state.terrain[10*50+10]=13;state.terrain[20*50+25]=12;
  new DataView(state.actors[0].buffer).setInt32(8,22000,true);return {state,result:0};
 });
 expect(r.ballTerrain).toBe(1);expect(r.ballTile).toEqual({x:10,z:10});expect(r.actorTile).toEqual({x:20,z:25});expect(r.actorTerrain).toBe(12);expect(r.next).toBe('continue');expect(q).toEqual(before);
});
test('off-map ball receives original terrain 20 and negative delay skips after condition work',()=>{
 const q=fresh(),a=new DataView(q.actors[0].buffer);a.setInt32(0xdc,-1,true);a.setInt16(0xa6,-1,true);
 const r=originalActorDispatch(q,(_,state)=>({state,result:0}));
 expect(r.ballTerrain).toBe(20);expect(r.next).toBe('skip');expect(r.calls).toHaveLength(1);
 expect(new DataView(r.state.actors[0].buffer).getInt16(0xb0,true)).toBe(16);
});
