import {test,expect} from '@playwright/test';
import {originalSwingClearance} from '../src/simulation/original-swing-clearance.js';
function fresh(){const actors=Array.from({length:152},()=>new Uint8Array(256)),a=new DataView(actors[0].buffer);actors[0][0x28]=1;actors[0][0x29]=1;actors[0][0x2a]=1;a.setInt16(0xaa,1,true);a.setInt32(8,10240,true);a.setInt32(12,10752,true);a.setInt32(0xdc,11000,true);a.setInt32(0xe0,11000,true);a.setInt32(0xd4,30,true);a.setInt32(0xd8,10,true);return {actorId:0,actors,seed:17,ballTerrain:1,swingOverride:1,roundClock:0,holeTees:[null,{x:2,z:10}]};}
function blocker(q){const b=q.actors[151],v=new DataView(b.buffer);b[0x29]=1;b[0x2a]=2;v.setUint32(0x18,0x400,true);v.setInt32(8,16000,true);v.setInt32(12,10752,true);v.setInt32(0xdc,16000,true);v.setInt32(0xe0,10752,true);return v;}
test('last actor slot blocks the shot corridor and consumes the native retry draw',()=>{
 const q=fresh();blocker(q);const before=structuredClone(q),r=originalSwingClearance(q);expect(r.corridorClear).toBe(false);expect(r.randomDraws).toBe(1);expect(r.state.actors[0][0x25]).toBe(11);expect(q).toEqual(before);
});
test('clear course starts swing, moves golfer onto ball and clears original flag',()=>{
 const q=fresh();new DataView(q.actors[0].buffer).setUint32(0x18,0x20000,true);const r=originalSwingClearance(q),a=new DataView(r.state.actors[0].buffer);
 expect(r.corridorClear).toBe(true);expect(r.state.actors[0][0x25]).toBe(16);expect(a.getInt32(8,true)).toBe(11000);expect(a.getUint32(0x18,true)&0x20000).toBe(0);expect(r.randomDraws).toBe(0);
});
test('manual flag overrides clearance wait without changing the observed blocked corridor',()=>{
 const q=fresh();blocker(q);new DataView(q.actors[0].buffer).setUint32(0x18,0x200,true);const r=originalSwingClearance(q);expect(r.corridorClear).toBe(false);expect(r.state.actors[0][0x25]).toBe(16);expect(r.randomDraws).toBe(0);
});
test('putting timing still consumes its zero-range random draw',()=>{
 const q=fresh();q.swingOverride=0;const r=originalSwingClearance(q);expect(r.randomDraws).toBe(1);expect(r.state.seed).not.toBe(q.seed);expect(r.corridorClear).toBe(true);
});
test('off-line golfers and same-stroke golfers do not obstruct the corridor',()=>{
 const q=fresh(),b=blocker(q);b.setInt32(12,25000,true);expect(originalSwingClearance(q).corridorClear).toBe(true);
 b.setInt32(12,10752,true);q.actors[151][0x2a]=1;expect(originalSwingClearance(q).corridorClear).toBe(true);
});
