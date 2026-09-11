import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteOptions} from '../src/simulation/original-route-options.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-options.json',import.meta.url),'utf8'));
function run(q){const cells=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags}]));const calls=[];let i=0;
 const result=originalRouteOptions({...q,terrainAt:p=>cells.get(`${p.x},${p.z}`),assessShot:c=>{calls.push({type:'assess',...c});return q.costs[c.shape+1]+c.flag*3;}},c=>{calls.push({type:'simulate',...c});return {landing:q.landings[i++]};});return {result,calls};}
test('six-option loop matches original state and ordered simulator/assessor calls',()=>{
 for(const [q,e,calls] of rows){const before=JSON.stringify(q);expect(run(q)).toEqual({result:e,calls});expect(JSON.stringify(q)).toBe(before);}
});
test('positive origin class leaves corner scores and cached statistics untouched',()=>{
 const q={...rows[0][0],originClass:1,scores:[100000,100000,100000,12,34,56]};const a=run(q);
 expect(a.calls).toEqual([]);expect(a.result.scores).toEqual(q.scores);expect(a.result.distances).toEqual(q.distances);expect(a.result.flags).toEqual(q.flags);
});
test('disallowed curves are excluded while straight options retain previous exclusions',()=>{
 const q={...rows[0][0],originClass:0,shapeMask:0,scores:[0,99999,0,0,99999,0]};const a=run(q);
 expect(a.calls).toEqual([]);expect(a.result.scores).toEqual([100000,99999,100000,100000,99999,100000]);
});

test('corner gate reads current origin class instead of the initial snapshot',()=>{
 const q={...rows[0][0],originClass:0,originClassAt:()=>8,scores:[100000,100000,100000,12,34,56]};
 const a=run(q);expect(a.calls).toEqual([]);expect(a.result.scores).toEqual(q.scores);
});
