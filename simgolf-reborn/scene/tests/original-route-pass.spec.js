import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRoutePass} from '../src/simulation/original-route-pass.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-pass.json',import.meta.url),'utf8'));
function run(q){const cells=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags}]));const calls=[];let i=0;
 const result=originalRoutePass({...q,terrainAt:p=>cells.get(`${p.x},${p.z}`),assessShot:c=>{calls.push({type:'assess',...c});return q.costs[c.shape+1]+c.flag*3;}},c=>{calls.push({type:'simulate',...c});return {landing:q.landings[(i++)%q.landings.length]};});return {result,calls};}
test('441-tile passes match original score grids, shared state and ordered calls',()=>{
 for(const [q,e,calls] of rows){const before=JSON.stringify(q);expect(run(q)).toEqual({result:e,calls});expect(JSON.stringify(q)).toBe(before);}
});
test('fully excluded grid preserves previous state without simulation',()=>{
 const q={...rows[0][0],scores:Array.from({length:441},()=>Array(6).fill(100000))};const a=run(q);
 expect(a.calls).toEqual([]);expect(a.result.scores).toEqual(q.scores);expect(a.result.distances).toEqual(q.distances);expect(a.result.flags).toEqual(q.flags);expect(a.result.winner).toEqual(q.winner);expect(a.result.work).toBe(q.work);
});
test('full pass replays deterministically from serialized state',()=>{
 const q=rows[1][0];expect(run(JSON.parse(JSON.stringify(q)))).toEqual(run(q));
});
