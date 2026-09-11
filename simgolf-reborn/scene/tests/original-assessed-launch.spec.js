import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAssessedLaunch} from '../src/simulation/original-assessed-launch.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-assessed-launch.json',import.meta.url),'utf8'));
const mapFor=q=>({terrainAt:(x,z)=>q.terrain[x*50+z],kindAt:c=>q.kinds[c],shotClassAt:c=>q.classes[c+1],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});
test('assessment through final launch matches contiguous original execution and shared cache',()=>{
 let cache=originalStrengthCache();let corrected=0,draws=0;
 for(const [q,e] of rows){const a=originalAssessedLaunch(q,cache,mapFor(q));expect(a).toEqual(e);cache=a.cache;corrected+=a.distance!==q.distance;draws+=a.assessment.draws;}
 expect(corrected).toBeGreaterThan(0);expect(draws).toBeGreaterThan(0);
});
test('terrain-derived launch fields replace stale caller estimates',()=>{
 const q=rows[0][0],map=mapFor(q);
 const clean=originalAssessedLaunch(q,originalStrengthCache(),map);
 const stale={...q,terrainCode:22,shotClass:100,targetTerrainCode:20,tileFlags:65535,firstWaterIndex:19,assessmentSpan:999};
 expect(originalAssessedLaunch(stale,originalStrengthCache(),map)).toEqual(clean);
});
test('assessment launch can replay from serialized inputs without mutating shared state',()=>{
 const q=rows[1][0],cache=originalStrengthCache(),before=JSON.stringify({q,cache});
 const a=originalAssessedLaunch(q,cache,mapFor(q));expect(JSON.stringify({q,cache})).toBe(before);
 const copy=JSON.parse(before);expect(originalAssessedLaunch(copy.q,copy.cache,mapFor(copy.q))).toEqual(a);
});
test('automatic search sentinel fails before reading map or changing state',()=>{
 expect(()=>originalAssessedLaunch({...rows[0][0],plannerArgument:-1},originalStrengthCache(),new Proxy({},{get(){throw Error('Unexpected map read');}}))).toThrow('resolved planner argument');
});
