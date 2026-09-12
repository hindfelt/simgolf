import {test,expect} from '@playwright/test';
import {originalResolvedCupCompletion} from '../src/simulation/original-resolved-cup-completion.js';
function fixture(){const b=new Uint8Array(256),partner=new Uint8Array(256);b[0x20]=32;b[0x29]=1;b[0x2a]=3;b[0xac]=7;b[0xaa]=1;b[0x8c]=1;partner[0x29]=1;new DataView(b.buffer).setUint32(0x18,0x40000,true);new DataView(b.buffer).setInt32(0xec,100,true);const p=new Uint8Array(20);p[0]=1;return {actorId:0,actors:[b,partner],ballTile:{x:20,z:15},visualSlot:2,globalFlags:0,settlementMode:0,settlementBonus:0,periodIndex:0,cashTotal:100,phaseCounter:100,financialPeriods:[p],completionRecords:[new Uint8Array(44)],completionNotices:Array.from({length:64},()=>new Uint8Array(76)),holeRecords:Array.from({length:21},()=>{const b=new Uint8Array(520);b[0]=4;return b;}),difficulty:1,adjustmentSetting:0};}
test('holed ball runs scoring and payment once before clearing motion state',()=>{
 const s=fixture(),r=originalResolvedCupCompletion(s,(_,state)=>({state}));expect(r.next).toBe('skip');expect(r.state.cashTotal).toBe(107);expect(r.state.completionRecords[0][23]).toBe(4);expect(r.state.actors[0][0x29]).toBe(2);expect(r.state.actors[0][0x2a]).toBe(0);const a=new DataView(r.state.actors[0].buffer);expect(a.getInt32(0xec,true)).toBe(0);expect(a.getUint32(0x18,true)&0x40000).toBe(0);expect(r.calls.map(e=>e.address)).toEqual([0x40c1f0,0x4093b0,0x426b00,0x40c580]);expect(s.cashTotal).toBe(100);
});
test('unrecovered match continuation is not treated as completed ordinary golf',()=>{
 const s=fixture();s.actors[0][0x21]=16;s.actors[1][0x21]=16;s.actors[1][0x29]=2;expect(()=>originalResolvedCupCompletion(s,(_,state)=>({state}))).toThrow('0x426ff6');
});
