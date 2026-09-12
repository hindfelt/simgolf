import {test,expect} from '@playwright/test';
import {originalVisualSlotEntry} from '../src/simulation/original-visual-slot-entry.js';
const fresh=()=>{const r=new Uint8Array(76);r[0x12]=9;r[0x13]=255;r[0x14]=251;r[0x15]=5;return {visualRecords:[r],actors:[new Uint8Array(256)],financialPeriods:[new Uint8Array(20),new Uint8Array(20)],periodIndex:0,cashTotal:2147483647,phaseCounter:4,selectedActor:-1};};
test('visual payment re-reads actor state and post-effect period without mutating source',()=>{
 const s=fresh(),before=structuredClone(s),seen=[];
 const out=originalVisualSlotEntry(s,0,(event,state)=>{
  seen.push(event.address);
  if(event.address===0x4672d0)expect(new DataView(state.actors[0].buffer).getInt16(0xb0,true)).toBe(99);
  if(event.address===0x40c580){expect(new DataView(state.actors[0].buffer).getInt16(0xb0,true)).toBe(0);state.periodIndex=1;}
  return {state,value:0};
 });
 expect(seen).toEqual([0x4672d0,0x40c580]);expect(out.state.cashTotal).toBe(-2147483647);
 expect(new DataView(out.state.financialPeriods[1].buffer).getUint16(4,true)).toBe(2);expect(s).toEqual(before);expect(out.next).toBe('0x402b6b');
});
test('inactive visual slots and entry delay leave movement explicitly skipped',()=>{
 const s=fresh();s.visualRecords[0][0x13]=0;expect(originalVisualSlotEntry(s,0).next).toBe('skip');
 s.visualRecords[0][0x13]=255;s.phaseCounter=1;new DataView(s.visualRecords[0].buffer).setUint16(0x1a,1,true);
 const out=originalVisualSlotEntry(s,0);expect(out.next).toBe('skip');expect(out.state.visualRecords[0][0x15]).toBe(5);expect(out.state.visualRecords[0][0x1a]).toBe(0);
});
