import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalFacilityLevels} from '../src/simulation/original-facility-levels.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-facility-levels.json',import.meta.url)));
test('facility tables match original aggregation and inverted clamp bounds',()=>{
 for(const [r,out] of rows){const input=Uint8Array.from(r),before=input.slice();expect(originalFacilityLevels(input)).toEqual(out);expect(input).toEqual(before);}
});
test('active airstrip bonus uses the highest level plus one, not building count',()=>{
 const records=new Uint8Array(4096),v=new DataView(records.buffer);
 for(let i=0;i<3;i++){v.setInt16(i*16,14,true);v.setInt32(i*16+8,i,true);}
 expect(originalFacilityLevels(records).activeLevels[14]).toBe(0);
 records[7]=0x40;expect(originalFacilityLevels(records).activeLevels[14]).toBe(1);
 records[23]=0x40;records[39]=0x40;expect(originalFacilityLevels(records).activeLevels[14]).toBe(3);
});
