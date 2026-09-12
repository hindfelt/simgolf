import {test,expect} from '@playwright/test';
import {originalHoleCompletionState} from '../src/simulation/original-hole-completion-state.js';
function fresh(id=0){const actors=[];actors[id]=new Uint8Array(256);const b=actors[id],a=new DataView(b.buffer);b[0x29]=1;b[0x2a]=7;b[0x8c]=3;b[0x24]=13;a.setInt32(0xdc,25000,true);a.setInt32(0xc8,20,true);a.setUint32(0x18,0xffffffff,true);const notices=Array.from({length:64},()=>new Uint8Array(76));notices[63][0]=1;notices[63][1]=id;return {actorId:id,actors,completionRecords:[new Uint8Array(44)],completionNotices:notices,holeRecords:Array.from({length:20},()=>new Uint8Array(520)),phaseCounter:100,globalFlags:0};}
test('completion records score before clearing stroke state and accumulates playing time',()=>{
 const q=fresh(),before=structuredClone(q),r=originalHoleCompletionState(q),a=new DataView(r.state.actors[0].buffer);
 expect(r.state.completionRecords[0][21]).toBe(7);expect(r.state.actors[0][0x2a]).toBe(0);expect(a.getInt32(0xdc,true)).toBe(0);expect(new DataView(r.state.holeRecords[1].buffer).getInt32(0x1ec,true)).toBe(40);expect(a.getInt32(0xc8,true)).toBe(100);expect(r.state.completionNotices[63][0]).toBe(3);expect(r.next).toBe('0x426f3b');expect(q).toEqual(before);
});
test('reaction mutations select the refreshed scorecard and event continuation',()=>{
 const q=fresh();q.actors[0][0x8c]=0;const r=originalHoleCompletionState(q,(e,state)=>{expect(e.args).toEqual([0,19,0]);state.actors[0][0x29]=2;state.actors[0][0x2a]=6;state.phaseCounter=120;state.globalFlags=0x200000;return {state};});
 expect(r.state.completionRecords[0][22]).toBe(6);expect(new DataView(r.state.holeRecords[2].buffer).getInt32(0x1ec,true)).toBe(50);expect(r.next).toBe('0x427e25');
});
test('notice owner bytes retain signed comparisons across actor 127 and 128',()=>{
 expect(originalHoleCompletionState(fresh(127)).state.completionNotices[63][0]).toBe(3);expect(originalHoleCompletionState(fresh(128)).state.completionNotices[63][0]).toBe(1);
});
test('signed phase ordering does not add time across the high-bit transition',()=>{
 const q=fresh();q.phaseCounter=0x80000000;const r=originalHoleCompletionState(q);expect(new DataView(r.state.holeRecords[1].buffer).getInt32(0x1ec,true)).toBe(0);expect(new DataView(r.state.actors[0].buffer).getUint32(0xc8,true)).toBe(0x80000000);
});
