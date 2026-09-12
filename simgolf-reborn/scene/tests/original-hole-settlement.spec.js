import {test,expect} from '@playwright/test';
import {originalHoleSettlement} from '../src/simulation/original-hole-settlement.js';
function fresh(){const b=new Uint8Array(256),a=new DataView(b.buffer);b[0x21]=3;b[0x29]=1;b[0x2a]=3;b[0xc2]=1;a.setInt16(0xac,-5,true);const holes=Array.from({length:20},()=>new Uint8Array(520));new DataView(holes[1].buffer).setUint32(0x200,3,true);const record=new Uint8Array(44);return {actorId:0,actors:[b],holeRecords:holes,statRecords:Array.from({length:32},()=>new Uint8Array(184)),completionRecords:[record],settlementMode:2,settlementBonus:7};}
test('settlement records histogram, signed stroke total and scorecard before preparing value',()=>{
 const q=fresh(),before=structuredClone(q),r=originalHoleSettlement(q,(_,state)=>({state}));
 expect(r.calls).toEqual([{address:0x405e80,args:[1,4]},{address:0x405e80,args:[1,4]}]);expect(new DataView(r.state.holeRecords[1].buffer).getUint16(0x28+(3*11+3)*2,true)).toBe(1);const s=new DataView(r.state.statRecords[13].buffer);expect(s.getInt32(0x24,true)).toBe(3);expect(s.getUint32(0x70,true)).toBe(1);expect(r.state.actors[0][0x2c]).toBe(3);expect(r.state.settlementValue).toBe(1);expect(q).toEqual(before);
});
test('assessment changes refresh hole/style while keeping the original variant argument',()=>{
 const q=fresh();const r=originalHoleSettlement(q,(e,state)=>{state.actors[0][0x21]=2;state.actors[0][0x29]=2;return {state};});
 expect(r.calls.map(e=>e.args)).toEqual([[1,4],[2,4]]);expect(new DataView(r.state.holeRecords[1].buffer).getUint16(0x28+(3*11+3)*2,true)).toBe(0);expect(new DataView(r.state.holeRecords[2].buffer).getUint16(0x28+(2*11+3)*2,true)).toBe(1);
});
test('nonzero actor class skips aggregate statistics but writes its scorecard',()=>{
 const q=fresh();q.actors[0][0x20]=1;const r=originalHoleSettlement(q);expect(r.calls).toEqual([]);expect(r.state.actors[0][0x2c]).toBe(3);expect(r.state.statRecords).toEqual(q.statRecords);
});
test('clamped histogram and signed totals retain native byte interpretation and callback value edits',()=>{
 const q=fresh();q.actors[0][0x2a]=255;q.completionRecords[0][0x12]=4;new DataView(q.statRecords[13].buffer).setUint32(0x70,0xffffffff,true);
 const r=originalHoleSettlement(q,(e,state)=>{if(e.address===0x40c1f0)state.settlementValue++;return {state};});
 expect(new DataView(r.state.statRecords[13].buffer).getInt32(0x24,true)).toBe(-1);expect(new DataView(r.state.statRecords[13].buffer).getUint32(0x70,true)).toBe(0);expect(new DataView(r.state.holeRecords[1].buffer).getUint16(0x28+33*2,true)).toBe(1);expect(r.state.settlementValue).toBe(4);
});
