import {test,expect} from '@playwright/test';
import {originalActorAirPhase} from '../src/simulation/original-actor-air-phase.js';
function fixture(){const b=new Uint8Array(256),a=new DataView(b.buffer);for(const [o,v] of [[0xdc,20992],[0xe0,20992],[0xe4,50],[0xec,160]])a.setInt32(o,v,true);return {actors:[b],actorId:0,previousTerrainHeight:0,ballTile:{x:20,z:20},ballTerrain:21,terrainFlags:5,variant:0,luck:0,seed:1};}
test('collision sound sees deflected ball before flag and golfer reaction',()=>{
 const s=fixture(),observed=[];
 const r=originalActorAirPhase(s,(e,state)=>{const a=new DataView(state.actors[0].buffer);observed.push([e.address,a.getUint32(0x18,true),a.getInt32(0xec,true)]);if(e.address===0x40c1f0)a.setInt32(0xec,999,true);if(e.address===0x4672d0)a.setUint32(0x18,0x8000,true);return {state,value:0};});
 expect(observed).toEqual([[0x42f110,0,160],[0x40c1f0,0,108],[0x4672d0,0,999]]);expect(new DataView(r.state.actors[0].buffer).getUint32(0x18,true)).toBe(0x8002);expect(new DataView(s.actors[0].buffer).getInt32(0xec,true)).toBe(160);expect(r.randomDraws).toBe(4);
});
test('sound callback can suppress reaction without losing collision flag',()=>{
 const r=originalActorAirPhase(fixture(),(e,state)=>{if(e.address===0x40c1f0)new DataView(state.actors[0].buffer).setUint32(0x18,2,true);return {state,value:0};});expect(r.calls.map(e=>e.address)).toEqual([0x42f110,0x40c1f0]);expect(r.hit).toBe(true);
});
test('already marked collision does not emit another impact',()=>{
 const s=fixture();new DataView(s.actors[0].buffer).setUint32(0x18,2,true);const r=originalActorAirPhase(s,(_,state)=>({state,value:0}));expect(r.calls.map(e=>e.address)).toEqual([0x42f110]);expect(r.hit).toBe(false);expect(r.next).toBe('0x42c527');
});
