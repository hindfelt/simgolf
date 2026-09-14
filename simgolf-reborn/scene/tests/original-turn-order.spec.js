import {test,expect} from '@playwright/test';
import {originalTurnOrder} from '../src/simulation/original-turn-order.js';
function fresh(){const actors=Array.from({length:3},(_,i)=>{const b=new Uint8Array(256),a=new DataView(b.buffer);a.setInt16(0xaa,1,true);a.setUint32(0x18,0x400,true);a.setInt32(0xdc,20480+i*5000,true);a.setInt32(0xe0,20480,true);b[0x29]=1;b[0x28]=1;return b;});return {actorId:0,actors,holeTargets:[null,{x:20,z:20}]};}
test('partner readiness gates the normal branch independently of relative cup distance',()=>{
 const q=fresh(),r=originalTurnOrder(q);expect(r.closerToCup).toBe(true);expect(r.next).toBe('0x42b3f2');
 new DataView(q.actors[1].buffer).setUint32(0x18,0,true);
 const waiting=originalTurnOrder(q);expect(waiting.partnerNotReady).toBe(true);expect(waiting.next).toBe('0x428ad1');
});
test('partner refresh rereads the partner record and leaves the input unchanged',()=>{
 const q=fresh();q.actors[1][0x29]=0;const before=structuredClone(q);
 const r=originalTurnOrder(q,(_,state)=>{new DataView(state.actors[0].buffer).setInt16(0xaa,2,true);return {state};});
 expect(r.calls).toEqual([{address:0x425b50,args:[0]}]);expect(r.closerToCup).toBe(true);expect(q).toEqual(before);
 expect(()=>originalTurnOrder(q)).toThrow(/explicit resolver/);
});
test('equal cup distances do not mark the current player as closer',()=>{
 const q=fresh();q.actors[1].set(q.actors[0]);expect(originalTurnOrder(q).closerToCup).toBe(false);
});
