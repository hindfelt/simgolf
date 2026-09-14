import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalSelectedLaunch} from '../src/simulation/original-selected-launch.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-selected-launch.json',import.meta.url),'utf8'));
const terrain=q=>({kindAt:p=>(p.x+p.z)%2?0:13,shotClassAt:lie=>q.classes[lie+1]});
test('resolved-target launch matches complete original final state and shared cache',()=>{
 let cache=originalStrengthCache();const types=new Set();
 for(const [q,e] of rows){
  const actual=originalSelectedLaunch(q,cache,terrain(q));expect(actual).toEqual(e);types.add(actual.shotType);
  cache=JSON.parse(JSON.stringify(actual.cache));
 }
 expect(types.has(3)).toBe(true);expect(types.has(4)).toBe(true);
});
test('original search sentinel cannot silently bypass unresolved middle planning',()=>{
 const q={...rows[0][0],plannerArgument:-1};
 expect(()=>originalSelectedLaunch(q,originalStrengthCache(),terrain(q))).toThrow('resolved planner argument');
});
test('inputs and shared cache remain immutable across complete launch',()=>{
 const [q]=rows[0],cache=originalStrengthCache(),before=JSON.stringify({q,cache});
 const result=originalSelectedLaunch(q,cache,terrain(q));
 expect(JSON.stringify({q,cache})).toBe(before);
 const copy=JSON.parse(before);
 expect(originalSelectedLaunch(copy.q,copy.cache,terrain(copy.q))).toEqual(result);
});
