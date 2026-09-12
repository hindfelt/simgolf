import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalTargetNeighborhood} from '../src/simulation/original-target-neighborhood.js';
const base=()=>({target:{x:25,z:25},origin:{x:1024,z:1024},span:3,distance:100,obstacles:0,accumulated:0,totals:Array(32).fill(0),directions:Array(32).fill(0),dominantCode:9,dominantDirection:7});
test('assessment matches original fixtures without mutating inputs',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-target-neighborhood.json',import.meta.url),'utf8'));
 for(const [q,e] of rows){const before=JSON.stringify(q);expect(originalTargetNeighborhood(q,(x,z)=>q.terrain[x*50+z],c=>q.classes[c])).toEqual(e);expect(JSON.stringify(q)).toBe(before);}
});
test('unavailable tiles incur edge penalty without terrain votes',()=>{
 const q=base();const r=originalTargetNeighborhood(q,()=>20,()=>{throw Error('Unexpected class vote');});
 expect(r.rating).toBe(21);expect(r.totals).toEqual(q.totals);expect(r.dominantCode).toBe(0);
});
test('green origin overrides difficulty and short shots cap it',()=>{
 const q=base();q.accumulated=600;q.obstacles=2;
 expect(originalTargetNeighborhood(q,()=>1,()=>0).rating).toBe(0);
 q.distance=40;expect(originalTargetNeighborhood(q,()=>2,()=>0).rating).toBe(10);
 q.distance=41;expect(originalTargetNeighborhood(q,()=>2,()=>0).rating).toBe(104);
});
test('dominant vote retains last neighbor direction and negative-only fallback',()=>{
 const q=base();const r=originalTargetNeighborhood(q,()=>2,()=>2);
 expect(r.dominantCode).toBe(2);expect(r.dominantDirection).toBe(7);expect(r.totals[2]).toBe(32);
 q.totals.fill(-10000);const negative=originalTargetNeighborhood(q,()=>2,()=>-2);
 expect(negative.dominantCode).toBe(9);expect(negative.dominantDirection).toBe(7);
});
