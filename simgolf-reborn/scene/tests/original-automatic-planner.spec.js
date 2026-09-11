import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutomaticPlanner} from '../src/simulation/original-automatic-planner.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
import {searchLaunchMap} from './helpers/original-search-launch.js';
const direct=JSON.parse(readFileSync(new URL('./fixtures/original-direct-automatic-planner.json',import.meta.url),'utf8'));
const long=JSON.parse(readFileSync(new URL('./fixtures/original-search-launch.json',import.meta.url),'utf8'));

test('unified direct path retains complete native entry-to-launch results',()=>{
 for(const [q,e] of direct){
  const before=structuredClone(q);
  expect(originalAutomaticPlanner(q,{map:{planning:middleMap(q)}},middleEffects(q))).toEqual({...e,searched:null});
  expect(q).toEqual(before);
 }
});

test('long targets execute physical search and launch deterministically from initial actor state',()=>{
 // These native course snapshots exercise orchestration. The native outer
 // planner entry-to-search wiring is not yet covered by this comparison.
 for(const [source] of [long[0],long[5]]){
  const q=structuredClone(source.automatic);
  Object.assign(q.planning,{cup:source.cup,rangeInput:{...source.rangeInput,abilityFlags:source.abilityFlags},
   worldFlags:source.worldFlags,driftMode:source.mode,obstacleCount:0});
  Object.assign(q.state,{seed:source.seed,cache:originalStrengthCache(),landing:source.winner.landing});
  q.state.actor.target=structuredClone(source.previousTarget);
  const before=structuredClone(q);
  const dependencies={map:searchLaunchMap(source),physical:{luck:5},
   searchState:{...source,candidateLanding:source.landing},score:source.aimScore,
   scoreAt:(x,z)=>source.aimScores[x*50+z]};
  const effects={emit:(_event,state)=>state};
  const result=originalAutomaticPlanner(q,dependencies,effects);
  expect(result.searched).not.toBeNull();
  expect(result.searched.search.work).toBeGreaterThan(0);
  expect(result.state.actor.target).toEqual(result.searched.result.target);
  expect(result.state.seed).not.toBe(source.seed);
  expect(originalAutomaticPlanner(structuredClone(q),dependencies,effects)).toEqual(result);
  const stale={...dependencies,searchState:{...dependencies.searchState,actorId:99,origin:{x:0,z:0},
   actorFlags:0xffffffff,actorClass:99,skillMask:0,shotCounter:99,hole:99,level:99,mode:99,
   cup:{x:1,z:1},previousTarget:{x:1,z:1},diagnostics:99}};
  expect(originalAutomaticPlanner(q,stale,effects)).toEqual(result);
  expect(q).toEqual(before);
 }
});

test('long targets without search context fail before emitting launch effects',()=>{
 const q=structuredClone(direct.find(([q])=>!q.planning.explicitTarget&&!q.originTerrainCode)[0]);
 q.planning.cup={x:40,z:40};
 expect(()=>originalAutomaticPlanner(q,{map:{planning:middleMap(q)}},{emit:()=>{throw Error('Premature launch');}}))
  .toThrow('require physical search state');
});
