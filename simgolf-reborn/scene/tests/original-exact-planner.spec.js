import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalExactPlanner} from '../src/simulation/original-exact-planner.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-exact-planner.json',import.meta.url),'utf8'));
const mapFor=q=>({terrainAt:(x,z)=>q.terrain[x*50+z],kindAt:c=>q.kinds[c],shotClassAt:c=>q.classes[c+1],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});
test('planner entry through exact-point launch matches original execution and shared cache',()=>{
 let cache=originalStrengthCache();let changed=0;
 for(const [q,e] of rows){const before=JSON.stringify({q,cache});const a=originalExactPlanner(q,cache,mapFor(q));expect(a).toEqual(e);expect(JSON.stringify({q,cache})).toBe(before);cache=a.cache;changed+=a.setup.shotClassOverrides.length;}
 expect(changed).toBeGreaterThan(0);
});
test('returned global patches affect the next range lookup when persisted',()=>{
 const q=structuredClone(rows[0][0]);q.actorFlags=1;q.classes.fill(0);q.terrain[25*50+25]=17;
 q.rangeInput={skillMask:0,difficulty:0,level:0,shot:0,professional:false,abilityFlags:0,power:0,longDrive:0,boost:0,lengthBonus:0};
 const a=originalExactPlanner(q,originalStrengthCache(),mapFor(q));expect(a.setup.range).toBe(140);
 for(const patch of a.setup.shotClassOverrides)q.classes[patch.code+1]=patch.shotClass;
 const b=originalExactPlanner(q,a.cache,mapFor(q));expect(b.setup.range).toBe(88);
});
test('exact planner ignores stale caller range and replays serialized state',()=>{
 const q={...rows[1][0],range:-1000},cache=originalStrengthCache(),serialized=JSON.stringify({q,cache});
 const a=originalExactPlanner(q,cache,mapFor(q));const copy=JSON.parse(serialized);
 expect(originalExactPlanner(copy.q,copy.cache,mapFor(copy.q))).toEqual(a);expect(a.setup.range).toBeGreaterThan(0);
});
test('automatic target path is rejected before entry patches are evaluated',()=>{
 expect(()=>originalExactPlanner({...rows[0][0],plannerArgument:-1},originalStrengthCache(),{})).toThrow('exact target coordinate');
});
