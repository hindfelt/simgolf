import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteLandingReview} from '../src/simulation/original-route-landing-review.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-landing-review.json',import.meta.url),'utf8'));
const terrainAt=()=>({code:2,shotClass:0,flags:0});
test('full landing review matches contiguous original executable fixtures',()=>{
 for(const [q,e] of rows){const cells=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags}]));expect(originalRouteLandingReview({...q,terrainAt:p=>cells.get(`${p.x},${p.z}`)})).toEqual(e);}
});
test('progress flag requires both a 25-yard advantage and more than twice remaining distance',()=>{
 const q={...rows[0][0],skillMask:0,score:0,goodLandings:0,heading:0x40000001,cornerTarget:false,target:{x:20,z:25},cup:{x:30,z:25},terrainAt};
 const far=originalRouteLandingReview({...q,landing:{x:25*1024+512,z:25*1024+512}});expect(far.plannedRemaining).toBe(250);expect(far.remaining).toBe(125);expect(far.sampleFlags).toBe(0x40000000);
 const close=originalRouteLandingReview({...q,landing:{x:26*1024+512,z:25*1024+512}});expect(close.sampleFlags).toBe(0x40000001);
});
test('corner and center intended targets use different remaining distances',()=>{
 const q={...rows[0][0],skillMask:0,target:{x:25,z:25},cup:{x:30,z:25},terrainAt};
 expect(originalRouteLandingReview({...q,cornerTarget:false}).plannedRemaining).toBe(125);
 expect(originalRouteLandingReview({...q,cornerTarget:true}).plannedRemaining).toBeGreaterThan(125);
});
