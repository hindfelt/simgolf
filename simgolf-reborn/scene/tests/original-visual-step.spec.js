import {test,expect} from '@playwright/test';
import {originalVisualStep} from '../src/simulation/original-visual-step.js';
function fixture(){const b=new Uint8Array(76),v=new DataView(b.buffer);v.setInt32(0,10000,true);v.setInt32(4,10000,true);b[0x12]=1;b[0x16]=2;v.setInt16(0x18,1,true);return {visualRecords:[b],terrain:new Uint8Array(2500),tileFlags:new Uint16Array(2500),metadata:[{walkingCost:3}],seed:1234};}
test('last visual stride advances without consuming randomness and preserves source',()=>{
 const s=fixture(),before=structuredClone(s),out=originalVisualStep(s,0),v=new DataView(out.state.visualRecords[0].buffer);
 expect(v.getInt32(0,true)).toBe(10032);expect(v.getInt32(4,true)).toBe(10000);expect(v.getInt16(0x18,true)).toBe(0);expect(v.getInt16(0x1e,true)).toBe(7);
 expect(out.randomDraws).toBe(0);expect(out.state.seed).toBe(s.seed);expect(s).toEqual(before);
});
test('collision pause is recorded while the current stride still advances',()=>{
 const s=fixture(),other=s.visualRecords[0].slice();new DataView(other.buffer).setInt32(0,10200,true);s.visualRecords.unshift(other);
 const out=originalVisualStep(s,1),v=new DataView(out.state.visualRecords[1].buffer);
 expect(v.getInt16(0x1a,true)).toBeGreaterThanOrEqual(4);expect(v.getInt16(0x1a,true)).toBeLessThanOrEqual(7);expect(v.getInt32(0,true)).toBeGreaterThan(10000);expect(out.randomDraws).toBe(1);
});
test('return-home flag overrides terrain and boosted movement speed',()=>{
 const s=fixture();s.visualRecords[0][0x12]=24;s.visualRecords[0][0x13]=250;s.tileFlags.fill(32);
 const out=originalVisualStep(s,0);expect(new DataView(out.state.visualRecords[0].buffer).getInt32(0,true)).toBe(10032);
});
