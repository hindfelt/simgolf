import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {runSearchLaunch} from './helpers/original-search-launch.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-search-launch.json',import.meta.url),'utf8'));

test('physical search and final automatic launch match the same native course and shared state',()=>{
 for(const [q,e] of rows){
  const before=structuredClone(q);
  expect(runSearchLaunch(q)).toEqual(e);
  expect(q).toEqual(before);
 }
 expect(rows.some(([q])=>q.scenario==='mixed-pro')).toBe(true);
 expect(rows.some(([,e])=>e.launch.state.seed!==e.searched.shared.seed)).toBe(true);
 expect(rows.some(([,e])=>e.launch.events.length>0)).toBe(true);
});

test('serialized complete search-to-launch requests replay deterministically',()=>{
 const [q,e]=rows[0];expect(runSearchLaunch(JSON.parse(JSON.stringify(q)))).toEqual(e);
});
