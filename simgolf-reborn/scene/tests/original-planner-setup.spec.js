import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPlannerSetup} from '../src/simulation/original-planner-setup.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-planner-setup.json',import.meta.url),'utf8'));
const mapFor=q=>({terrainAt:()=>q.surface,shotClassAt:c=>q.classes[c]});
test('full planner entry and range match original executable fixtures',()=>{
 for(const [q,e] of rows)expect(originalPlannerSetup({...q,rangeInput:q},mapFor(q))).toEqual(e);
});
test('range reads original terrain class before returning explicit class mutations',()=>{
 const q={...rows[0][0],actorId:0,actorFlags:1,surface:17,classes:Array(23).fill(0)};
 const before=JSON.stringify(q);const a=originalPlannerSetup({...q,rangeInput:q},mapFor(q));
 const b=originalPlannerSetup({...q,actorFlags:0,rangeInput:q},mapFor(q));
 expect(a.range).toBe(b.range);expect(a.shotClassOverrides).toEqual([{code:17,shotClass:32},{code:20,shotClass:32}]);
 expect(b.shotClassOverrides).toEqual([]);expect(JSON.stringify(q)).toBe(before);
});
test('special actors consult effective lie metadata for range rather than map lie',()=>{
 const q={...rows[0][0],actorId:154,shot:0,surface:17};const reads=[];
 const result=originalPlannerSetup({...q,rangeInput:q},{terrainAt:()=>17,shotClassAt:c=>{reads.push(c);return 0;}});
 expect(reads).toEqual([0]);expect(result.terrainCode).toBe(17);
});
test('obstacle state resets unless enabled with a positive count',()=>{
 const q=rows[0][0];const run=(worldFlags,obstacleCount)=>originalPlannerSetup({...q,rangeInput:q,worldFlags,obstacleCount},mapFor(q)).obstacleIndex;
 expect(run(0,3)).toBe(-1);expect(run(32,0)).toBe(-1);expect(run(32,-2)).toBe(-1);expect(run(32,3)).toBe(2);
});
