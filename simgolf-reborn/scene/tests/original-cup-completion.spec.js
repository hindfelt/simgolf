import {test,expect} from '@playwright/test';
import {originalCupCompletion} from '../src/simulation/original-cup-completion.js';
function fresh(){const b=new Uint8Array(256),a=new DataView(b.buffer);a.setInt32(0xdc,20100,true);a.setInt32(0xe0,25100,true);a.setInt32(0xec,200,true);a.setUint32(0x18,0x40000,true);b[0x2a]=2;b[0x29]=1;return {actorId:0,actors:[b],ballTile:{x:20,z:25},visualSlot:3,seed:17};}
test('cup sound precedes snapping, visual update and exactly one stroke before settlement',()=>{
 const q=fresh(),before=structuredClone(q),seen=[];
 const r=originalCupCompletion(q,(e,state)=>{const a=new DataView(state.actors[0].buffer);seen.push([e.address,a.getInt32(0xdc,true),a.getInt32(0xe0,true),state.actors[0][0x2a]]);return {state};});
 expect(seen).toEqual([[0x40c1f0,20100,25100,2],[0x4093b0,20992,26112,2],[0x426b00,20992,26112,3]]);expect(r.next).toBe('skip');expect(new DataView(r.state.actors[0].buffer).getInt32(0xec,true)).toBe(0);expect(q).toEqual(before);
});
test('visual and settlement mutations are retained with the original final cleanup',()=>{
 const q=fresh();const r=originalCupCompletion(q,(e,state)=>{const a=new DataView(state.actors[0].buffer);if(e.address===0x4093b0)state.actors[0][0x2a]=255;if(e.address===0x426b00){expect(state.actors[0][0x2a]).toBe(0);a.setUint32(0x18,0x40001,true);a.setInt32(0xec,500,true);state.actors[0][0x29]=2;state.seed=99;}return {state};});
 expect(r.state.actors[0][0x29]).toBe(2);expect(r.state.seed).toBe(99);expect(new DataView(r.state.actors[0].buffer).getUint32(0x18,true)).toBe(1);expect(new DataView(r.state.actors[0].buffer).getInt32(0xec,true)).toBe(0);
});
test('offscreen cups omit visual work and incomplete resolvers fail without mutating input',()=>{
 const q=fresh();q.visualSlot=-1;expect(originalCupCompletion(q,(_,state)=>({state})).calls.map(e=>e.address)).toEqual([0x40c1f0,0x426b00]);const before=structuredClone(q);expect(()=>originalCupCompletion(q)).toThrow('explicit resolver');expect(q).toEqual(before);
});
