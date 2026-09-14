import {test,expect} from '@playwright/test';
import {originalBetweenHoleState} from '../src/simulation/original-between-hole-state.js';
import {originalNextHoleTransition} from '../src/simulation/original-next-hole-transition.js';
function fixture(){const actors=[new Uint8Array(256),new Uint8Array(256)];actors[0][0x29]=1;actors[0][0xaa]=1;actors[1][0x29]=1;const a=new DataView(actors[0].buffer);a.setInt16(0xac,80,true);a.setInt16(0xbc,-9,true);actors[0][0x3e]=255;return {actorId:0,actors,completionRecords:[new Uint8Array(44)],holeRecords:Array.from({length:20},()=>{const b=new Uint8Array(520);b[0]=4;return b;}),difficulty:2,adjustmentSetting:0,globalFlags:0};}
test('between-hole records preserve signed truncation and byte histories before adjustment',()=>{
 const s=fixture();new DataView(s.actors[0].buffer).setUint32(0x18,0x100000,true);const r=originalBetweenHoleState(s),a=new DataView(r.state.actors[0].buffer);
 expect(a.getInt16(0xbc,true)).toBe(73);expect(a.getUint8(0x40)).toBe(73);expect(a.getUint8(0x65)).toBe(80);expect(a.getInt8(0x3e)).toBe(0);expect(a.getInt16(0xac,true)).toBe(66);expect(s.actors[0][0x3e]).toBe(255);
});
test('ordinary transition advances then applies between-hole state',()=>{
 const r=originalNextHoleTransition(fixture());expect(r.next).toBe('return');expect(r.state.actors[0][0x29]).toBe(2);expect(r.state.actors[0][0x66]).toBe(80);
});
test('round exit dispatches reset without silently inventing reset behavior',()=>{
 const s=fixture();s.holeRecords[2][0]=0;expect(()=>originalNextHoleTransition(s)).toThrow('resolver');
 const r=originalNextHoleTransition(s,(e,state)=>{expect(e).toEqual({address:0x425b50,args:[0]});state.actors[0][0x29]=0;return {state};});expect(r.state.actors[0][0x29]).toBe(0);expect(r.next).toBe('return');
});
test('last-hole special visitors stop at their unrecovered dialogue',()=>{
 for(const [type,next] of [[0x40,'0x427f01'],[0x60,'0x427efa']]){const s=fixture();s.holeRecords[3][0]=0;s.actors[0][0x20]=type;const r=originalNextHoleTransition(s);expect(r.next).toBe(next);expect(r.state.actors[0][0x3e]).toBe(255);}
});
