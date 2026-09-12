import {test,expect} from '@playwright/test';
import {originalActorMotionGate} from '../src/simulation/original-actor-motion-gate.js';
function fresh(){const b=new Uint8Array(256),a=new DataView(b.buffer);a.setUint32(0x18,0x40000,true);a.setInt32(0xec,100,true);a.setInt16(0xa6,-1,true);return {actorId:0,phaseCounter:1,actors:[b]};}
test('negative delay permits motion and does not continue even when it reaches zero',()=>{
 const q=fresh(),r=originalActorMotionGate(q);expect(r.next).toBe('motion');expect(r.previousFlags).toBeNull();
 expect(new DataView(r.state.actors[0].buffer).getInt16(0xa6,true)).toBe(0);
 expect(new DataView(q.actors[0].buffer).getInt16(0xa6,true)).toBe(-1);
 const r2=originalActorMotionGate({...q,phaseCounter:0});expect(new DataView(r2.state.actors[0].buffer).getInt16(0xa6,true)).toBe(-1);
});
test('zero speed clears the motion flag before the negative delay decision',()=>{
 const q=fresh();new DataView(q.actors[0].buffer).setInt32(0xec,0,true);
 const r=originalActorMotionGate(q);expect(r.next).toBe('skip');expect(new DataView(r.state.actors[0].buffer).getUint32(0x18,true)).toBe(0);
});
test('cleanup rereads actor flags before clearing the transient bit and testing strokes',()=>{
 const q=fresh(),a=new DataView(q.actors[0].buffer);a.setInt16(0xa6,0,true);a.setUint32(0x18,0x80000000,true);
 const r=originalActorMotionGate(q,(event,state)=>{if(event.address===0x406450){new DataView(state.actors[0].buffer).setUint32(0x18,0x8008,true);state.actors[0][0x2a]=10;}return {state};});
 expect(r.calls.map(e=>e.address)).toEqual([0x406450,0x426b00]);expect(r.previousFlags).toBe(0x8008);expect(r.next).toBe('skip');
 expect(new DataView(r.state.actors[0].buffer).getUint32(0x18,true)).toBe(8);
 expect(()=>originalActorMotionGate(q)).toThrow(/explicit resolver/);
});
