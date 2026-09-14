import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalDirectAutomaticPlanner} from '../src/simulation/original-assessed-automatic-launch.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-direct-automatic-planner.json',import.meta.url),'utf8'));

test('complete direct planner matches native entry through restoration',()=>{
 for(const [q,e] of rows){
  const before=structuredClone(q),map=middleMap(q);
  const classes=[map.shotClassAt(17),map.shotClassAt(20)];
  expect(originalDirectAutomaticPlanner(q,map,middleEffects(q))).toEqual(e);
  expect(q).toEqual(before);
  expect([map.shotClassAt(17),map.shotClassAt(20)]).toEqual(classes);
 }
 expect(new Set(rows.map(([,e])=>e.setup.range)).size).toBeGreaterThan(10);
 expect(rows.some(([q,e])=>q.originTerrainCode===17&&e.setup.shotClassOverrides.length===2)).toBe(true);
});

test('caller range and stale actor copies cannot replace the entry range query',()=>{
 for(const [q,e] of rows.slice(0,16)){
  const replay=structuredClone(q);
  replay.planning.range=1;
  replay.planning.actorFlags=0xffffffff;
  Object.assign(replay.planning.rangeInput,{shot:255,professional:!q.state.actor.actorClass,skillMask:255});
  expect(originalDirectAutomaticPlanner(replay,middleMap(replay),middleEffects(replay))).toEqual(e);
 }
});

test('temporary setup classes restore to eight at planner exit',()=>{
 for(const [,e] of rows.filter(([q])=>q.state.actor.actorFlags&1)){
  expect(e.setup.shotClassOverrides).toEqual([{code:17,shotClass:32},{code:20,shotClass:32}]);
  expect(e.shotClassOverrides).toEqual([{code:17,shotClass:8},{code:20,shotClass:8}]);
 }
});
