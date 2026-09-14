import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalTargetGeometry} from '../src/simulation/original-target-geometry.js';
import {originalResolvedShot} from '../src/simulation/original-resolved-shot.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const fixtures=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));
const geometry=fixtures('original-target-geometry'),rows=fixtures('original-resolved-shot');
const mapFor=q=>({terrainAt:(x,z)=>q.terrain[x*50+z],kindAt:c=>q.kinds[c],shotClassAt:c=>q.classes[c+1],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});
test('target geometry matches original executable',()=>{
 for(const [q,e] of geometry)expect(originalTargetGeometry(q)).toEqual(e);
});
test('exact point overrides cup and stored target and derives containing tile',()=>{
 const q={...geometry[0][0],x:512,z:512,plannerArgument:2048,targetZ:512};
 const g=originalTargetGeometry(q);expect(g.target).toEqual({x:2,z:0});expect(g.heading).toBe(0x40000000);expect(g.distance).toBe(37);
});
test('tile targeting uses cup unless explicit, and explicit modes reset shot curve',()=>{
 const q={...geometry[0][0],plannerArgument:-1,x:512,z:512,cup:{x:2,z:0},target:{x:0,z:2},curve:-1,mode:3,explicitTarget:false};
 expect(originalTargetGeometry(q).target).toEqual(q.cup);expect(originalTargetGeometry(q).curve).toBe(-1);
 const explicit=originalTargetGeometry({...q,explicitTarget:true});expect(explicit.target).toEqual(q.target);expect(explicit.curve).toBe(0);
});
test('exact target through final launch matches contiguous original execution',()=>{
 let cache=originalStrengthCache();
 for(const [q,e] of rows){const before=JSON.stringify({q,cache});const a=originalResolvedShot(q,cache,mapFor(q));expect(a).toEqual(e);expect(JSON.stringify({q,cache})).toBe(before);cache=a.cache;}
});
test('automatic target search remains explicit rather than using incomplete exact-point path',()=>{
 expect(()=>originalResolvedShot({...rows[0][0],plannerArgument:-1},originalStrengthCache(),{})).toThrow('exact target coordinate');
});
