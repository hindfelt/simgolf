import {test,expect} from '@playwright/test';
import {originalRoutePruning} from '../src/simulation/original-route-pruning.js';
const grid=()=>Array.from({length:441},()=>Array(6).fill(100000));
const run=(scores,rest={})=>originalRoutePruning({scores,bestScore:100,samples:2,work:0,...rest});
test('equal cutoff survives; exceeding it is permanently excluded',()=>{
 const scores=grid();scores[0]=[228,228,229,99999,100000,100];
 const result=run(scores);
 expect(result.scores[0]).toEqual([228,228,99999,99999,100000,100]);
 expect(result.survivors).toEqual([{candidate:0,option:0},{candidate:0,option:1},{candidate:0,option:5}]);
 expect(scores[0][2]).toBe(229);
});
test('work estimate tightens margin until surviving options fit',()=>{
 const scores=grid();for(let i=0;i<10;i++)scores[i]=[100,110,140,180,220,99999];
 const result=run(scores,{samples:4});
 expect(result.passes).toEqual([{margin:128,count:50},{margin:64,count:30},{margin:32,count:20}]);
 expect(result.nextSamples).toBe(8);expect(result.continueSearch).toBe(true);
});
test('minimum margin and small survivor count stop pruning even over budget',()=>{
 const scores=grid();for(let i=0;i<10;i++)scores[i]=Array(6).fill(100);
 expect(run(scores,{work:251}).passes.map(p=>p.margin)).toEqual([128,64,32,16]);
 const small=grid();small[0]=[100,100,100,100,99999,99999];
 expect(run(small,{work:999}).passes).toEqual([{margin:128,count:4}]);
});
test('all excluded options mark candidate; second slot sentinel skips whole row',()=>{
 const scores=grid();scores[0]=Array(6).fill(99999);scores[1]=[0,100000,0,0,0,0];
 const result=run(scores);
 expect(result.scores[0][1]).toBe(100000);expect(result.survivors).toEqual([]);
 expect(result.continueSearch).toBe(false);
});
