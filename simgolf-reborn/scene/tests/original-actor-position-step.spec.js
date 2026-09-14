import {test,expect} from '@playwright/test';
import {originalActorPositionStep} from '../src/simulation/original-actor-position-step.js';
function fixture(){const b=new Uint8Array(256),a=new DataView(b.buffer);a.setInt32(0xdc,20992,true);a.setInt32(0xe0,20992,true);a.setInt32(0xec,160,true);a.setInt32(0xf0,32,true);return {actorId:0,actors:[b],visualSlot:2,phaseCounter:8};}
test('apex visual precedes gravity and periodic visual sees the refreshed velocity',()=>{
 const s=fixture(),seen=[];const r=originalActorPositionStep(s,(e,state)=>{const a=new DataView(state.actors[0].buffer);if(e.address===0x4096e0){seen.push(a.getInt32(0xf0,true));if(seen.length===1)a.setInt32(0xf0,200,true);}return {state,value:123};});expect(seen).toEqual([32,136]);expect(r.previousTerrainHeight).toBe(123);expect(r.stepX).toBe(0);expect(r.stepCosine).toBe(10);expect(r.next).toBe('0x42beb0');expect(new DataView(s.actors[0].buffer).getInt32(0xf0,true)).toBe(32);
});
test('stationary vertical state has no gravity but retains scheduled visible effect',()=>{
 const s=fixture();new DataView(s.actors[0].buffer).setInt32(0xf0,0,true);const r=originalActorPositionStep(s,(_,state)=>({state,value:0}));expect(r.calls.map(e=>e.address)).toEqual([0x42f110,0x4096e0]);expect(new DataView(r.state.actors[0].buffer).getInt32(0xf0,true)).toBe(0);
});
test('offscreen motion omits both visuals while still applying gravity',()=>{
 const s=fixture();s.visualSlot=-1;const r=originalActorPositionStep(s,(_,state)=>({state,value:0}));expect(r.calls).toHaveLength(1);expect(new DataView(r.state.actors[0].buffer).getInt32(0xf0,true)).toBe(-32);
});
