import {test,expect} from '@playwright/test';
import {originalHoleComplete} from '../src/simulation/original-hole-complete.js';
import {originalMatchCompletionEntry} from '../src/simulation/original-match-completion-entry.js';
function fixture(){const actors=[new Uint8Array(256),new Uint8Array(256)];actors[0][0x20]=32;actors[0][0x29]=1;actors[0][0x2a]=4;actors[0][0xac]=7;actors[0][0xaa]=1;actors[0][0x8c]=1;actors[1][0x29]=1;const periods=[new Uint8Array(20)];periods[0][0]=1;return {actorId:0,actors,globalFlags:0,settlementMode:0,settlementBonus:0,periodIndex:0,cashTotal:100,phaseCounter:100,financialPeriods:periods,completionRecords:[new Uint8Array(44)],completionNotices:Array.from({length:64},()=>new Uint8Array(76)),holeRecords:Array.from({length:21},()=>{const b=new Uint8Array(520);b[0]=4;return b;}),difficulty:1,adjustmentSetting:0};}
test('ordinary paid hole advances through the composed completion path',()=>{
 const r=originalHoleComplete(fixture(),(_,state)=>({state}));expect(r.next).toBe('return');expect(r.state.cashTotal).toBe(107);expect(r.state.actors[0][0x29]).toBe(2);expect(r.state.actors[0][0x2a]).toBe(0);expect(r.state.completionRecords[0][23]).toBe(4);
});
test('paired match waits for the partner and uses signed recorded scores',()=>{
 const s=fixture();s.actors[0][0x21]=16;s.actors[1][0x21]=16;s.actors[0][0x2c]=255;s.actors[1][0x2c]=5;
 expect(originalMatchCompletionEntry(s).next).toBe('0x427a53');s.actors[1][0x29]=2;const r=originalMatchCompletionEntry(s);expect(r.totals).toEqual({actorStrokes:-1,partnerStrokes:5,par:4});expect(r.next).toBe('0x426ff6');s.actors[1][0x29]=255;expect(originalMatchCompletionEntry(s).next).toBe('0x427a53');
});
test('matched completion does not silently execute ordinary result handling',()=>{
 const s=fixture();s.actors[0][0x21]=16;s.actors[1][0x21]=16;s.actors[1][0x29]=2;const r=originalHoleComplete(s,(_,state)=>({state}));expect(r.next).toBe('0x426ff6');expect(r.state.actors[0][0x29]).toBe(1);expect(r.state.cashTotal).toBe(107);
});
