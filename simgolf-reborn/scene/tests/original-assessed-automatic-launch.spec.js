import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAssessedAutomaticLaunch} from '../src/simulation/original-assessed-automatic-launch.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-assessed-automatic-launch.json',import.meta.url),'utf8'));
test('assessment through automatic restoration matches uninterrupted native state',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);
  expect(originalAssessedAutomaticLaunch(q,middleMap(q),middleEffects(q))).toEqual(e);
  expect(JSON.stringify(q)).toBe(before);
 }
 expect(rows.some(([,e])=>e.state.actor.club===13)).toBe(true);
 expect(rows.some(([,e])=>e.samples>0)).toBe(true);
});
test('later reactions receive scenery produced earlier in the same launch',()=>{
 const selected=rows.find(([q,e])=>q.state.sceneryTile===0&&e.events.some(event=>event.kind===0x1c));
 expect(selected).toBeTruthy();
 const [q,e]=selected;
 expect(originalAssessedAutomaticLaunch(q,middleMap(q),middleEffects(q))).toEqual(e);
});
test('current actor and shared state override stale planning copies',()=>{
 for(const [q,e] of rows.slice(0,8)){
  const replay=JSON.parse(JSON.stringify(q));
  Object.assign(replay.planning,{seed:1,actorId:99,actorFlags:0xffffffff,actorClass:32,skillMask:0,shotCounter:99,target:{x:1,z:1}});
  expect(originalAssessedAutomaticLaunch(replay,middleMap(replay),middleEffects(replay))).toEqual(e);
 }
});
test('exact-coordinate requests cannot silently enter the automatic path',()=>{
 const q=structuredClone(rows[0][0]);q.planning.plannerArgument=123;
 const map=new Proxy({},{get:()=>{throw Error('Unexpected map access');}});
 expect(()=>originalAssessedAutomaticLaunch(q,map,{})).toThrow('automatic planner sentinel');
});
