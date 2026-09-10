import {test, expect} from '@playwright/test';
import {originalSgaTargets, originalSgaReport} from '../src/simulation/original-sga.js';
const perfect = holes => {const t=originalSgaTargets(holes);return {holes,length:t.length,minutes:240,funPercent:100,variety:t.qualityHoles,scenic:t.qualityHoles,lengthHoles:t.qualityHoles,accuracyHoles:t.qualityHoles,imaginationHoles:t.qualityHoles,facilities:t.facilities};};
test('original category boundaries and integer length targets',()=>{
 expect([5,6,9,10,17,18].map(n=>originalSgaTargets(n).category)).toEqual([0,1,1,2,2,3]);
 expect([5,9,17,18].map(n=>originalSgaTargets(n).length)).toEqual([1539,3100,6298,7200]);
 expect(originalSgaTargets(10).qualityHoles).toBe(10);
 expect(()=>originalSgaTargets(19)).toThrow();
});
test('each criterion can veto a championship rather than being averaged away',()=>{
 const m=perfect(18);
 expect(originalSgaReport(m).score).toBe(100);
 for (const [key,value] of [['length',6100],['minutes',301],['funPercent',9],['variety',8],['scenic',8],['lengthHoles',8],['accuracyHoles',8],['imaginationHoles',8],['facilities',5]]) {
  const r=originalSgaReport({...m,[key]:value});expect(r.score).toBe(0);expect(r.unacceptable).toHaveLength(1);
 }
 expect(originalSgaReport(perfect(10)).unacceptable).toEqual(['holes']);
});
test('signed truncation preserves time and fun boundaries and facility requirement',()=>{
 const m=perfect(18);
 expect([240,241,294,295,300,301].map(minutes=>originalSgaReport({...m,minutes}).grades.time)).toEqual([10,9,1,1,1,0]);
 expect([99,100,109].map(funPercent=>originalSgaReport({...m,funPercent}).grades.fun)).toEqual([9,10,10]);
 expect([8,9,10].map(facilities=>originalSgaReport({...m,facilities}).grades.facilities)).toEqual([6,8,10]);
 expect(originalSgaReport(m).recommendation).toBe('Grand Slam Championship!');
 expect(originalSgaReport(perfect(5)).recommendation).toBe('Mini Slam Championship!');
 expect(()=>originalSgaReport({...m,minutes:undefined})).toThrow();
});
