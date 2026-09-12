import {test,expect} from '@playwright/test';
import {originalPlannerWorldRecords} from '../src/simulation/original-planner-world-records.js';
import {originalProfileGroup} from '../src/simulation/original-profile-group.js';
function fresh(){return {actors:[new Uint8Array(256)],holes:[new Uint8Array(520)],completionRecords:[new Uint8Array(44)],profileRecords:[new Uint8Array(560),new Uint8Array(560)],metadata:[{shape:16,category:99}]};}
test('planner uses shape, signed hole counter and completed-hole mark from packed records',()=>{
 const s=fresh(),r=originalPlannerWorldRecords(s);new DataView(s.holes[0].buffer).setInt32(0x1fc,-123,true);s.completionRecords[0][24]=7;
 expect(r.categoryAt(0)).toBe(16);expect(r.holeRecordAt(0)).toBe(-123);expect(r.profileHoleMarkAt(0,2)).toBe(7);
 s.completionRecords[0][24]=8;expect(r.profileHoleMarkAt(0,2)).toBe(8);
 expect(()=>r.profileHoleMarkAt(0,22)).toThrow('profile hole');
});
test('planner profile classification uses BE rather than the speech profile B6',()=>{
 const s=fresh(),a=new DataView(s.actors[0].buffer);a.setInt16(0xb6,0,true);a.setInt16(0xbe,1,true);s.profileRecords[1][0x21]=128;
 const r=originalPlannerWorldRecords(s);expect(r.profileIndexFor(0)).toBe(1);expect(originalProfileGroup(0,r)).toBe(0);
 a.setInt16(0xbe,0,true);expect(originalProfileGroup(0,r)).toBe(1);
 a.setInt16(0xbe,-1,true);expect(r.profileIndexFor(0)).toBe(-1);expect(()=>originalProfileGroup(0,r)).toThrow('profile record');
});
test('missing records fail instead of providing neutral reaction values',()=>{
 const r=originalPlannerWorldRecords({});expect(()=>r.holeRecordAt(0)).toThrow('hole record');expect(()=>r.categoryAt(0)).toThrow('terrain shape');expect(()=>r.profileHoleMarkAt(0,0)).toThrow('completion record');
});
