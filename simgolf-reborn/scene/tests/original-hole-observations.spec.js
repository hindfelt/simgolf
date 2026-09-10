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
