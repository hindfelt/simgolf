import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteBatch} from '../src/simulation/original-route-batch.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-batch.json',import.meta.url),'utf8'));
function run(q){const cells=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags}]));const calls=[];let i=0;
 const result=originalRouteBatch({...q,terrainAt:p=>cells.get(`${p.x},${p.z}`),assessShot:c=>{calls.push({type:'assess',...c});return q.costs[c.shape+1]+c.flag*3;}},c=>{calls.push({type:'simulate',...c});return {landing:q.landings[i++]};});return {result,calls};}
test('complete trial batches match original scores, winner state and call order',()=>{
 for(const [q,e,calls] of rows){const before=JSON.stringify(q);expect(run(q)).toEqual({result:e,calls});expect(JSON.stringify(q)).toBe(before);}
});
test('batch replays identically after serialization and runs the requested samples',()=>{
 const q=rows[0][0],a=run(q);expect(run(JSON.parse(JSON.stringify(q)))).toEqual(a);
 expect(a.calls.filter(c=>c.type==='simulate')).toHaveLength(q.samples);
 expect(a.result.work).toBe(q.work+(q.cornerTarget?0:q.samples));
});
test('invalid batch size fails before simulation',()=>{
 expect(()=>originalRouteBatch({...rows[0][0],samples:0},()=>{throw Error('Unexpected simulation');})).toThrow('batch size');
});
