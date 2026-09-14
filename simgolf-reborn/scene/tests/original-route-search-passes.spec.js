import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteSearchPasses} from '../src/simulation/original-route-search-passes.js';
import {originalRoutePrunedState} from '../src/simulation/original-route-spread.js';
const fixture=name=>JSON.parse(readFileSync(new URL(`./fixtures/original-route-${name}.json`,import.meta.url),'utf8'));
const rows=fixture('search-passes');
function run(q){
 const cells=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags}]));
 const calls=[];let i=0;
 const result=originalRouteSearchPasses({...q,terrainAt:p=>cells.get(`${p.x},${p.z}`),
  assessShot:c=>{calls.push({type:'assess',...c});return q.costs[c.shape+1]+c.flag*3;}},
  c=>{calls.push({type:'simulate',...c});return {landing:q.landings[(i++)%q.landings.length]};});
 return {result,calls};
}
test('repeated searches match original full state and ordered callbacks',()=>{
 for(const [q,result,calls] of rows){
  const before=JSON.stringify(q);expect(run(q)).toEqual({result,calls});expect(JSON.stringify(q)).toBe(before);
 }
});
test('original fixtures cover three-pass progression and immediate stopping modes',()=>{
 expect(rows.some(([,e])=>e.passes.join(',')==='2,4,8')).toBe(true);
 expect(rows.some(([q,e])=>q.mode===2&&e.passes.length===1)).toBe(true);
 expect(rows.some(([q,e])=>q.samples===8&&e.passes.length===1)).toBe(true);
});
test('serialized searches replay deterministically',()=>{
 const q=rows.find(([,e])=>e.passes.length>1)[0];
 expect(run(JSON.parse(JSON.stringify(q)))).toEqual(run(q));
});
test('complete original pruning retries match final survivors and spread',()=>{
 for(const [q,e] of fixture('pruned-state')){
  const before=JSON.stringify(q);expect(originalRoutePrunedState(q)).toEqual(e);expect(JSON.stringify(q)).toBe(before);
 }
});
