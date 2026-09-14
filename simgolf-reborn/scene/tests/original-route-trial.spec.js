import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteTrial,originalPreparedRouteCandidate} from '../src/simulation/original-route-trial.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-trial.json',import.meta.url),'utf8'));
test('candidate geometry and score initialization match original executable',()=>{
 for(const [q,e] of rows){const before=JSON.stringify(q);expect(originalRouteTrial(q)).toEqual(e);expect(JSON.stringify(q)).toBe(before);}
});
test('only untested entries initialize six shot scores',()=>{
 const q=rows[0][0];const scores=[1,0,2,3,4,5];
 expect(originalRouteTrial({...q,scores}).scores).toEqual(Array(6).fill(100000));
 scores[1]=99999;expect(originalRouteTrial({...q,scores}).needsAdmission).toBe(false);
 scores[1]=100000;expect(originalRouteTrial({...q,scores})).toEqual({skip:true});
});
test('fresh trial geometry feeds original admission and excludes current tile',()=>{
 const q={anchor:{x:25,z:20},offset:{x:0,z:0},origin:{x:20992,z:20992},scores:Array(6).fill(0),cup:{x:30,z:20},previousTarget:{x:20,z:20},actorFlags:0,range:150,cupDistance:250};
 const map=()=>({code:2,shotClass:0});
 const a=originalPreparedRouteCandidate(q,map);expect(a.distance).toBe(125);expect(a.admission.eligible).toBe(true);expect(a.scores).toEqual(Array(6).fill(0));
 expect(originalPreparedRouteCandidate({...q,anchor:{x:20,z:20},actorFlags:1},map).admission.eligible).toBe(false);
});
test('cached or excluded trials never rerun terrain admission',()=>{
 for(const score of [1,99999,100000]){const q={...rows[0][0],scores:[0,score,0,0,0,0]};expect(()=>originalPreparedRouteCandidate(q,()=>{throw Error('Unexpected read');})).not.toThrow();}
});
