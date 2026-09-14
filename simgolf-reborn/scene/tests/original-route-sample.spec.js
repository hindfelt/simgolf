import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteSample} from '../src/simulation/original-route-sample.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-sample.json',import.meta.url),'utf8'));
test('sample requests and work accounting match original executable',()=>{
 for(const [q,e,work] of rows){const calls=[];const output={landing:{x:1,z:2},seed:123};const a=originalRouteSample(q,r=>{calls.push(r);return output;});expect(calls).toEqual(e);expect(a.work).toBe(work);expect(a.result).toBe(output);}
});
test('only center trial increments work while corner trial targets the vertex',()=>{
 const q={target:{x:10,z:11},actorId:154,curve:-1,work:5};const calls=[];
 expect(originalRouteSample({...q,cornerTarget:false},r=>calls.push(r)).work).toBe(6);
 expect(originalRouteSample({...q,cornerTarget:true},r=>calls.push(r)).work).toBe(5);
 expect(calls).toEqual([{actorId:154,x:10752,z:11776,curve:-1},{actorId:154,x:10240,z:11264,curve:-1}]);
});
