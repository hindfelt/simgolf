import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoLaunchMiddle} from '../src/simulation/original-auto-launch-middle.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-launch-middle.json',import.meta.url),'utf8'));
test('connected automatic middle matches uninterrupted original execution',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);
  expect(originalAutoLaunchMiddle(q,middleMap(q),middleEffects(q))).toEqual(e);
  expect(JSON.stringify(q)).toBe(before);
 }
 expect(rows.some(([,e])=>e.events.some(event=>event.kind===0x30))).toBe(true);
 expect(rows.some(([,e])=>e.samples>0)).toBe(true);
 expect(rows.some(([q,e])=>e.state.speed!==q.state.speed)).toBe(true);
});
test('putters bypass scenery and retain the hole counter',()=>{
 for(const [q,e] of rows.filter(([q])=>q.state.actor.club===13)){
  const map=middleMap(q);map.objectAt=()=>{throw Error('Putter entered scenery sampling');};
  expect(originalAutoLaunchMiddle(q,map,middleEffects(q))).toEqual(e);
  expect(e.samples).toBe(0);expect(e.state.holeCounter).toBe(q.state.holeCounter);
 }
});
test('complete automatic middle replays from a serialized snapshot',()=>{
 for(const [q] of rows.slice(0,8)){
  const replay=JSON.parse(JSON.stringify(q));
  expect(originalAutoLaunchMiddle(replay,middleMap(replay),middleEffects(replay))).toEqual(originalAutoLaunchMiddle(q,middleMap(q),middleEffects(q)));
 }
});
