import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAssessedRouteSearch} from '../src/simulation/original-route-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-live-metadata-search.json',import.meta.url),'utf8'));
function run(q){
 const patches=new Map();const cells=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags,kind:code===3?13:0}]));
 const calls=[];let i=0;
 const result=originalAssessedRouteSearch({...q,terrainAt:p=>{const t=cells.get(`${p.x},${p.z}`);return {...t,shotClass:patches.get(t.code)??t.shotClass};},shotClassAt:code=>patches.get(code)??(q.cells.find(c=>c[2]===code)?.[3]??(code===20?q.excludedClass:undefined)),
  },
  c=>{calls.push({type:'simulate',...c});patches.set(17,8);patches.set(20,8);return {landing:q.landings[(i++)%q.landings.length]};});
 return {result,calls};
}
test('live-metadata search matches original tables, published result and ordered callbacks',()=>{
 for(const [q,result,calls] of rows){
  const before=JSON.stringify(q);expect(run(q)).toEqual({result,calls});expect(JSON.stringify(q)).toBe(before);
 }
});
test('no candidate publishes cup fallback and clears temporary search state',()=>{
 const [q]=rows.find(([,e])=>e.search.winner.target.x===-1);
 const {result,calls}=run(q);
 expect(result.result.target).toEqual(q.cup);expect(result.result.curve).toBe(0);
 expect(result.result.cornerTarget).toBe(0);expect(result.result.worldFlags&0x800000).toBe(0);
 expect(result.result.candidateSkillMask).toBe(7);expect(calls.map(c=>c.type)).toEqual([]);
});
test('live-metadata search replays from serialized state',()=>{
 const q=rows[0][0];expect(run(JSON.parse(JSON.stringify(q)))).toEqual(run(q));
});
