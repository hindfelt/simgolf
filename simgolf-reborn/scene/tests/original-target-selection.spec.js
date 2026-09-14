import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalTargetSelection} from '../src/simulation/original-target-selection.js';
import {originalTargetGeometry} from '../src/simulation/original-target-geometry.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-target-selection.json',import.meta.url),'utf8'));
const mapFor=q=>({terrainAt:(x,z)=>q.cells.find(c=>c[0]===x&&c[1]===z)?.[2]??0,
 shotClassAt:code=>q.classes[code]});

test('connected target selection matches uninterrupted original execution',()=>{
 for(const [q,expected] of rows){
  const before=structuredClone(q);
  expect(originalTargetSelection(q,mapFor(q))).toEqual(expected);
  expect(q).toEqual(before);
 }
 expect(new Set(rows.map(([,e])=>e.request.path))).toEqual(new Set(['assessment','approach','search']));
 const adjustments=rows.filter(([,e])=>e.request.path==='approach')
  .map(([q,e])=>Math.sign(e.distance-originalTargetGeometry(q).distance));
 expect(new Set(adjustments)).toEqual(new Set([-1,0,1]));
});

test('search requests retain the cup and shared state until route search resolves',()=>{
 const noApproachReads={terrainAt:()=>{throw Error('Premature approach');}};
 let distinctWaypoint=false;
 for(const [q,e] of rows.filter(([,e])=>e.request.path==='search')){
  const a=originalTargetSelection(q,noApproachReads);
  expect(a).toEqual(e);
  expect(a.target).toEqual(q.cup);
  expect(a.landing).toEqual(q.landing);
  expect(a.landing).not.toBe(q.landing);
  expect(a.diagnostics).toBe(q.diagnostics);
  distinctWaypoint ||= a.target.x!==a.request.target.x || a.target.z!==a.request.target.z;
 }
 expect(distinctWaypoint).toBe(true);
});

test('explicit targets bypass automatic approach and preserve shared diagnostics',()=>{
 const noApproachReads={terrainAt:()=>{throw Error('Unexpected terrain read');}};
 for(const [q,e] of rows.filter(([,e])=>e.request.path==='assessment')){
  expect(originalTargetSelection(q,noApproachReads)).toEqual(e);
  expect(e.landing).toEqual(q.landing);
  expect(e.diagnostics).toBe(q.diagnostics);
 }
});
