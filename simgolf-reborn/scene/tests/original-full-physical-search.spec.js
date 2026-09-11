import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPhysicalRouteSearch,originalPhysicalTargetSearch} from '../src/simulation/original-physical-candidates.js';
import {originalShotMap} from '../src/simulation/original-shot-map.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-full-physical-search.json',import.meta.url),'utf8'));
const targetRows=JSON.parse(readFileSync(new URL('./fixtures/original-full-physical-target-search.json',import.meta.url),'utf8'));
function run(q){
const metadata=new Map(q.cells.map(c=>[c[2],{shotClass:c[3],kind:c[2]===3?13:0}]));if(!metadata.has(20))metadata.set(20,{shotClass:q.excludedClass,kind:0});
const map=originalShotMap({terrain:Uint8Array.from(q.cells.map(c=>c[2])),marks:Uint16Array.from(q.cells.map(c=>c[4])),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)},readHeight:()=>0,globalFlags:0,readRawTerrain:()=>0,metadata:code=>({...metadata.get(code),flags:0,bounceCoefficient:3,rollCoefficient:0})});
const shared={seed:q.seed,landing:q.landing,cache:originalStrengthCache(),shotClassOverrides:[]};
const dependencies={launch:q.launch,physical:{professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5},map,shared};
return q.aimScores?originalPhysicalTargetSearch(q,dependencies,{score:q.aimScore,
 scoreAt:(x,z)=>q.aimScores[x*50+z]}):originalPhysicalRouteSearch(q,dependencies);
}
test('complete physical searches match uninterrupted original tables, result and shared state',()=>{
 for(const [q,e] of rows){const before=JSON.stringify(q);expect(run(q)).toEqual(e);expect(JSON.stringify(q)).toBe(before);}
});
test('full search replays deterministically from serialized state',()=>{
 const q=rows[0][0];expect(run(JSON.parse(JSON.stringify(q)))).toEqual(run(q));
});

test('whole-search fixtures include water, obstacles and a professional golfer',()=>{
 expect(rows.some(([q])=>q.scenario==='mixed'&&q.cells.some(c=>c[2]===17)&&q.cells.some(c=>c[2]===3))).toBe(true);
 expect(rows.some(([q])=>q.scenario==='mixed-pro'&&q.actorClass!==0&&q.abilityFlags!==0)).toBe(true);
});

test('physical search hands native target and shared state to caller aim calculation',()=>{
 for(const [q,e] of targetRows){
  const before=structuredClone(q);
  expect(run(q)).toEqual(e);
  expect(q).toEqual(before);
 }
 expect(targetRows.some(([q,e])=>(q.skillMask&4)&&e.aim.score!==q.aimScore)).toBe(true);
 expect(targetRows.some(([q,e])=>!(q.skillMask&4)&&e.aim.score===q.aimScore)).toBe(true);
});
