import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteScoredLanding} from '../src/simulation/original-route-scored-landing.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-scored-landing.json',import.meta.url),'utf8'));
const terrain=q=>{const m=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags}]));return p=>m.get(`${p.x},${p.z}`);};
test('landing and follow-up scores and calls match contiguous original execution',()=>{
 let queried=0;
 for(const [q,e,expectedCalls] of rows){const calls=[],before=JSON.stringify(q);const a=originalRouteScoredLanding({...q,terrainAt:terrain(q),assessShot:c=>{calls.push(c);return q.costs[c.shape+1]+c.flag*3;}});expect(a).toEqual(e);expect(calls).toEqual(expectedCalls);expect(JSON.stringify(q)).toBe(before);queried+=calls.length;}
 expect(queried).toBeGreaterThan(0);
});
test('non-four-sample passes do not run follow-up assessment',()=>{
 const q={...rows[0][0],samples:2};expect(()=>originalRouteScoredLanding({...q,terrainAt:terrain(q),assessShot:()=>{throw Error('Unexpected assessment');}})).not.toThrow();
});
test('good landing counter and trial progress metadata survive follow-up scoring',()=>{
 const q={...rows[0][0],samples:4,mode:0,beyondTwoShots:false,skillMask:4,goodLandings:5,range:200,shapeMask:0};
 const a=originalRouteScoredLanding({...q,terrainAt:()=>({code:2,shotClass:0,flags:0}),assessShot:()=>20});
 expect(a.goodLandings).toBe(6);expect(Number.isInteger(a.sampleFlags)).toBe(true);expect(Number.isInteger(a.plannedRemaining)).toBe(true);expect(Number.isInteger(a.followupFlag)).toBe(true);
});
