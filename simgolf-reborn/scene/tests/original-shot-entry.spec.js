import {test,expect} from '@playwright/test';
import {originalShotEntry} from '../src/simulation/original-shot-entry.js';
function fresh(offset=255){
 const b=new Uint8Array(256),a=new DataView(b.buffer);a.setInt16(0xaa,1,true);a.setInt32(0xdc,25*1024+512+offset,true);a.setInt32(0xe0,35*1024+512,true);a.setUint32(0x18,0x1800,true);b[0x29]=1;b[0x2a]=255;b[0xc2]=3;b[0x21]=2;
 const partner=new Uint8Array(256);partner[0x29]=1;partner[0x25]=7;
 return {actorId:0,actors:[b,partner],closerToCup:false,holeTargets:[null,{x:25,z:35}],shotStatCounts:new Uint32Array(32),holeStrokeTotals:new Uint16Array(20)};
}
test('short-putt completion uses strict distance threshold and wraps native counters before callback',()=>{
 const q=fresh();q.shotStatCounts[11]=0xffffffff;q.holeStrokeTotals[1]=65535;const before=structuredClone(q);
 const r=originalShotEntry(q,(e,state)=>{
  expect(e).toEqual({address:0x426b00,args:[0]});expect(state.actors[0][0x2a]).toBe(0);expect(state.shotStatCounts[11]).toBe(0);expect(state.holeStrokeTotals[1]).toBe(0);
  state.actors[0][0x29]=2;return {state};
 });
 expect(r.next).toBe('skip');expect(r.state.actors[0][0x29]).toBe(2);expect(q).toEqual(before);
 expect(originalShotEntry(fresh(256)).next).toBe('0x42b55c');
});
test('partner wait uses the stroke-dependent threshold and signed partner animation',()=>{
 const q=fresh(1000);q.actors[1][0x25]=6;q.actors[0][0x2a]=0;
 let r=originalShotEntry(q);expect(r.next).toBe('skip');expect(r.state.actors[0][0x25]).toBe(11);
 q.actors[0][0x2a]=1;expect(originalShotEntry(q).next).toBe('0x42b55c');
 q.actors[1][0x25]=255;expect(originalShotEntry(q).next).toBe('skip');
});
test('moving and closer-turn exits do not clear flags or increment strokes',()=>{
 const q=fresh();q.closerToCup=true;expect(originalShotEntry(q)).toMatchObject({state:q,next:'0x42d23c'});
 new DataView(q.actors[0].buffer).setInt32(0xec,1,true);expect(originalShotEntry(q)).toMatchObject({state:q,next:'0x42b825'});
});
test('controlled golfer class bypasses near-cup completion and unresolved settlement fails explicitly',()=>{
 const q=fresh(0);q.actors[0][0x20]=0x20;expect(originalShotEntry(q).next).toBe('0x42b55c');
 expect(()=>originalShotEntry(fresh(0))).toThrow('explicit resolver');
});
