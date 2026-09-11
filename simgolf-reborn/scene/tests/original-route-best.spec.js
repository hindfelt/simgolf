import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteBest} from '../src/simulation/original-route-best.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-best.json',import.meta.url),'utf8'));
test('option score and winner updates match original executable fixtures',()=>{
 for(const [q,e] of rows){const before=JSON.stringify(q);expect(originalRouteBest(q)).toEqual(e);expect(JSON.stringify(q)).toBe(before);}
});
test('ties retain the prior target and all associated winner fields',()=>{
 const q=structuredClone(rows[0][0]);q.score=100;q.sampleScore=20;q.winner.score=120;
 const a=originalRouteBest(q);expect(a.winner).toEqual(q.winner);expect(a.winner).not.toBe(q.winner);
 q.sampleScore=19;const b=originalRouteBest(q);expect(b.winner.score).toBe(119);expect(b.winner.target).toEqual(q.target);expect(b.winner.curve).toBe(q.curve);expect(b.winner.landing).toEqual(q.landing);expect(b.winner.landingFlag).toBe(q.sampleFlags&1);
});
test('sample threshold clears but never re-enables the original search flag',()=>{
 const q={...rows[0][0],level:0,samples:4,searchFlag:1};
 expect(originalRouteBest({...q,badSamples:1}).searchFlag).toBe(1);expect(originalRouteBest({...q,badSamples:2}).searchFlag).toBe(0);
 expect(originalRouteBest({...q,searchFlag:0,badSamples:0}).searchFlag).toBe(0);
});
test('accumulated scores retain original signed integer overflow',()=>{
 const q={...rows[0][0],score:2147483600,sampleScore:1000};expect(originalRouteBest(q).score).toBe(-2147482696);
});
