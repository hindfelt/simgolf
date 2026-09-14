import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalDirectAutomaticLaunch} from '../src/simulation/original-assessed-automatic-launch.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-direct-automatic-launch.json',import.meta.url),'utf8'));

test('target selection through final automatic launch matches uninterrupted native execution',()=>{
 for(const [q,e] of rows){
  const before=structuredClone(q);
  expect(originalDirectAutomaticLaunch(q,middleMap(q),middleEffects(q))).toEqual(e);
  expect(q).toEqual(before);
 }
 expect(rows.some(([,e])=>e.state.actor.club===13)).toBe(true);
 expect(rows.some(([,e])=>e.samples>0)).toBe(true);
});

test('short approaches publish landing and reset diagnostics while explicit targets preserve them',()=>{
 for(const [q,e] of rows){
  if(q.planning.explicitTarget){
   expect(e.state.landing).toEqual(q.state.landing);
  }else{
   expect(e.state.landing).toEqual({x:q.planning.cup.x*1024+512,z:q.planning.cup.z*1024+512});
   expect(e.state.diagnostics).toBe(0);
  }
 }
});

test('current actor fields override stale target-selection copies',()=>{
 for(const [q,e] of rows.slice(0,12)){
  const replay=structuredClone(q);
  Object.assign(replay.planning,{target:{x:1,z:1},actorFlags:1,skillMask:4,seed:1});
  expect(originalDirectAutomaticLaunch(replay,middleMap(replay),middleEffects(replay))).toEqual(e);
 }
});

test('long shots cannot bypass physical search or emit premature reactions',()=>{
 const q=structuredClone(rows.find(([q])=>!q.planning.explicitTarget&&!q.originTerrainCode)[0]);
 q.planning.cup={x:40,z:40};
 const before=structuredClone(q);
 const effects={emit:()=>{throw Error('Premature reaction');}};
 expect(()=>originalDirectAutomaticLaunch(q,middleMap(q),effects)).toThrow('physical route search');
 expect(q).toEqual(before);
});
