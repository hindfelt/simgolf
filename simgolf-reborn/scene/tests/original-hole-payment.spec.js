import {test,expect} from '@playwright/test';
import {originalHolePayment} from '../src/simulation/original-hole-payment.js';
function fixture(){const b=new Uint8Array(256);b[0x29]=1;return {actorId:0,actors:[b],globalFlags:0,periodIndex:0,settlementValue:7,cashTotal:100,financialPeriods:[new Uint8Array(20),new Uint8Array(20)],holeRecords:Array.from({length:20},()=>new Uint8Array(520)),sourceText:'Old',recordHolder:-1,presentationMode:0};}
test('first fee presents the native tutorial before accounting and refreshes the amount afterward',()=>{
 const s=fixture(),r=originalHolePayment(s,(e,state)=>{if(e.address===0x466fb0)state.sourceText='Gary';if(e.address===0x40c7f0){expect(state.sourceText).toContain('first greens fee of 700 simoleans!');expect(state.cashTotal).toBe(100);state.settlementValue=9;}return {state};});expect(r.state.cashTotal).toBe(109);expect(new DataView(r.state.holeRecords[1].buffer).getInt32(0x1f4,true)).toBe(9);expect(r.calls.at(-1).args[0]).toBe(9);expect(s.cashTotal).toBe(100);
});
test('existing period fees skip tutorial and retain signed cash with wrapping period totals',()=>{
 const s=fixture();s.financialPeriods[0][0]=1;s.settlementValue=-7;const r=originalHolePayment(s,(_,state)=>({state}));expect(r.calls).toHaveLength(1);expect(r.state.cashTotal).toBe(93);expect(new DataView(r.state.financialPeriods[0].buffer).getUint16(0,true)).toBe(65530);
});
test('event mode bypasses ordinary fees and presentation',()=>{
 const s=fixture();s.globalFlags=0x200000;const r=originalHolePayment(s);expect(r.state).toEqual(s);expect(r.calls).toEqual([]);
});
test('joined settlement pays before completion clears the stroke state',async()=>{
 const {originalPaidHoleCompletion}=await import('../src/simulation/original-paid-hole-completion.js');const s=fixture();s.actors[0][0x20]=32;s.actors[0][0x2a]=3;s.actors[0][0x8c]=1;s.actors[0][0xac]=7;s.financialPeriods[0][0]=1;Object.assign(s,{settlementMode:0,settlementBonus:0,completionRecords:[new Uint8Array(44)],completionNotices:Array.from({length:64},()=>new Uint8Array(76)),phaseCounter:100});
 const r=originalPaidHoleCompletion(s,(e,state)=>{expect(e.address).toBe(0x40c580);expect(state.actors[0][0x2a]).toBe(3);return {state};});expect(r.state.cashTotal).toBe(107);expect(r.state.actors[0][0x2a]).toBe(0);expect(r.state.completionRecords[0][23]).toBe(3);expect(r.next).toBe('0x426f3b');
});
