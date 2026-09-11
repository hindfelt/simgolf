import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoLaunchFinish} from '../src/simulation/original-auto-launch-finish.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-launch-finish.json',import.meta.url),'utf8'));
test('automatic middle through final velocity matches uninterrupted original',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);
  expect(originalAutoLaunchFinish(q,middleMap(q),middleEffects(q))).toEqual(e);
  expect(JSON.stringify(q)).toBe(before);
 }
 expect(new Set(rows.map(([q])=>q.driftMode))).toEqual(new Set([0,1,2,3]));
 expect(new Set(rows.map(([q])=>q.curveArgument))).toEqual(new Set([-1,0,1]));
 expect(rows.some(([q,e])=>q.state.actor.club===13&&e.state.cache.next!==0)).toBe(true);
});
test('final launch replays from the complete serialized snapshot',()=>{
 for(const [q] of rows.slice(0,8)){
  const replay=JSON.parse(JSON.stringify(q));
  expect(originalAutoLaunchFinish(replay,middleMap(replay),middleEffects(replay))).toEqual(originalAutoLaunchFinish(q,middleMap(q),middleEffects(q)));
 }
});
test('each automatic launch publishes independent restoration writes',()=>{
 const q=rows[0][0];
 const first=originalAutoLaunchFinish(q,middleMap(q),middleEffects(q));
 expect(first.shotClassOverrides).toEqual([{code:17,shotClass:8},{code:20,shotClass:8}]);
 first.shotClassOverrides[0].shotClass=99;
 expect(originalAutoLaunchFinish(q,middleMap(q),middleEffects(q)).shotClassOverrides).toEqual([{code:17,shotClass:8},{code:20,shotClass:8}]);
});
