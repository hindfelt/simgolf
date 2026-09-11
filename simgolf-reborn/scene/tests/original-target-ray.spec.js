import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalTargetRay,originalTargetAssessment} from '../src/simulation/original-target-ray.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-target-ray.json',import.meta.url),'utf8'));
const mapFor=q=>({terrainAt:(x,z)=>q.terrain[x*50+z],shotClassAt:c=>q.classes[c],kindAt:c=>q.kinds[c],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});
test('original ray outputs and combined assessments match executable fixtures',()=>{
 for(const [q,ray,assessment] of rows){const before=JSON.stringify(q);expect(originalTargetRay(q,mapFor(q))).toEqual(ray);expect(originalTargetAssessment(q,mapFor(q))).toEqual(assessment);expect(JSON.stringify(q)).toBe(before);}
});
test('short distance does not sample map or consume randomness',()=>{
 const q={...rows[1][0],distance:24};
 const r=originalTargetRay(q,new Proxy({},{get(){throw Error('Unexpected map read');}}));
 expect(r.draws).toBe(0);expect(r.seed).toBe(q.seed);expect(r.span).toBe(0);expect(r.totals).toEqual(Array(32).fill(0));
});
test('unavailable center sample ends the scan before side randomness',()=>{
 const q={...rows[1][0],distance:100};const map=mapFor(q);map.terrainAt=()=>20;
 const r=originalTargetRay(q,map);expect(r.draws).toBe(0);expect(r.obstacles).toBe(0);expect(r.firstWaterIndex).toBe(0);
});
test('height checks read the reference before sample and switch after midpoint',()=>{
 const q={...rows[1][0],distance:100,origin:{x:26112,z:26112},originTile:{x:25,z:25},target:{x:30,z:30},heading:0};
 const reads=[];const map={terrainAt:()=>2,shotClassAt:()=>0,kindAt:()=>0,marksAt:()=>0,heightAt:(x,z)=>{reads.push([x,z]);return 0;}};
 const r=originalTargetRay(q,map);expect(r.draws).toBe(4);
 expect(reads.filter((_,i)=>i%2===0)).toEqual([[25,25],[25,25],[25,25],[30,30]]);
});
