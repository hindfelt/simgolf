import {test,expect} from '@playwright/test';
import {originalHoleObservations} from '../src/simulation/original-hole-observations.js';
const input = () => ({par:4,histogram:Array.from({length:8},()=>Array(9).fill(0)),difficulty:1,combineContrasts:false});
test('unplayed groups have eight par scores but no real completions',()=>{
 const r=originalHoleObservations(input());
 expect(r.groups).toEqual(Array(8).fill({count:8,strokes:32,hundredths:400}));
 expect(r.advantages).toEqual([0,0,0]);expect(r.completed).toBe(0);expect(r.averageHundredths).toBe(0);
});
test('exact complementary skill cohorts avoid confounding by unrelated groups',()=>{
 const a=input();a.histogram[7][2]=8;a.histogram[6][4]=8;
 const r=originalHoleObservations(a);
 expect(r.advantages).toEqual([100,50,50]);expect(r.completed).toBe(16);expect(r.averageHundredths).toBe(400);
 a.histogram[0][8]=300;
 expect(originalHoleObservations(a).advantages).toEqual(r.advantages);
 a.combineContrasts=true;
 const combined=originalHoleObservations(a);
 expect(combined.advantages).toEqual([587,537,537]);
});
test('seeded per-cohort integer division and inclusive difficulty threshold',()=>{
 const a=input();a.histogram[7][1]=2; // (32+4)/10 = 3.60; others remain 4.00
 expect(originalHoleObservations(a).advantages).toEqual([40,40,40]);
 expect(originalHoleObservations(a).qualifyingSkills).toEqual([false,false,false]);
 a.difficulty=0;expect(originalHoleObservations(a).qualifyingSkills).toEqual([true,true,true]);
 a.histogram[7][1]=3;expect(originalHoleObservations(a).advantages).toEqual([55,55,55]);
});
test('source score slots remain separate and invalid histogram/switch inputs reject',()=>{
 const a=input();a.histogram[3][6]=1;a.histogram[3][7]=1;a.histogram[3][8]=1;
 expect(originalHoleObservations(a).groups[3]).toEqual({count:11,strokes:56,hundredths:509});
 expect(()=>originalHoleObservations({...a,combineContrasts:undefined})).toThrow();
 a.histogram[0][0]=-1;expect(()=>originalHoleObservations(a)).toThrow();
});

test('original completion recording caps high scores and excludes extended mask rows',async()=>{
 const {originalScoreSlot}=await import('../src/simulation/original-hole-observations.js');
 expect(originalScoreSlot(12,6)).toEqual({row:6,bin:9,includedInSga:true});
 expect(originalScoreSlot(-1,7)).toEqual({row:7,bin:0,includedInSga:false});
 expect(originalScoreSlot(4,15)).toEqual({row:15,bin:4,includedInSga:false});
 expect(originalScoreSlot(4,0x87)).toEqual({row:7,bin:4,includedInSga:true});
 expect(()=>originalScoreSlot(128,0)).toThrow();
});
test('raw original record decoding honors offsets, stride and signed bins',async()=>{
 const {originalHoleRecordObservations}=await import('../src/simulation/original-hole-observations.js');
 const backing=new Uint8Array(540), record=backing.subarray(10,530);
 const v=new DataView(record.buffer,record.byteOffset,520);v.setInt8(0,4);
 // Skill mask 7: eight birdies; mask 6: eight scores of nine (including capped scores).
 v.setInt16(0x28+7*22+3*2,8,true);v.setInt16(0x28+6*22+9*2,8,true);
 const r=originalHoleRecordObservations(record,{difficulty:1,combineContrasts:false});
 expect(r.advantages).toEqual([300,50,50]);expect(r.completed).toBe(16);
 v.setInt16(0x28+2,-1,true);
 expect(()=>originalHoleRecordObservations(record,{difficulty:1,combineContrasts:false})).toThrow();
});
