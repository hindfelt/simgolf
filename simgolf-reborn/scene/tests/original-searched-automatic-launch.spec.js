import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalSearchedAutomaticLaunch} from '../src/simulation/original-searched-automatic-launch.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-assessed-automatic-launch.json',import.meta.url),'utf8'));

// Reconstruct the already-verified native assessment boundary in the shape
// returned by physical target search. This checks handoff ownership; it is
// not a claim that these synthetic search records came from route simulation.
function handoff(q){
 return {result:{target:structuredClone(q.state.actor.target),curve:q.planning.curve,
  diagnostics:q.state.diagnostics,worldFlags:q.planning.worldFlags,mode:q.planning.driftMode},
  aim:{distance:q.planning.distance,heading:q.planning.heading,actorFlags:q.state.actor.actorFlags},
  shared:{seed:q.state.seed,cache:structuredClone(q.state.cache),
   shotClassOverrides:[{code:17,shotClass:q.restorationClasses[0]},{code:20,shotClass:q.restorationClasses[1]}]},
  search:{searchFlag:q.followupFlag,winner:{landing:{x:123,z:456}}}};
}

test('search-owned fields replace stale inputs before the native-verified launch',()=>{
 for(const [q,e] of rows){
  const searched=handoff(q),before=structuredClone(searched),input=structuredClone(q);
  input.followupFlag=1-q.followupFlag;
  Object.assign(input.planning,{distance:0,heading:0,curve:99,worldFlags:0xffffffff,driftMode:99,explicitTarget:true});
  Object.assign(input.state,{seed:1,diagnostics:99,landing:{x:0,z:0},cache:{next:0,entries:[]}});
  Object.assign(input.state.actor,{target:{x:0,z:0},actorFlags:0xffffffff});
  const inputBefore=structuredClone(input);
  expect(originalSearchedAutomaticLaunch(input,searched,middleMap(q),middleEffects(q)))
   .toEqual({...e,state:{...e.state,landing:{x:123,z:456}}});
  expect(input).toEqual(inputBefore);
  expect(searched).toEqual(before);
 }
});

test('search metadata overrides are visible without mutating the course',()=>{
 const [q,e]=rows[0],searched=handoff(q),map=middleMap(q),reads=[];
 searched.shared.shotClassOverrides.push({code:q.targetTerrainCode,shotClass:map.shotClassAt(q.targetTerrainCode)});
 const guarded={...map,shotClassAt:code=>{
  reads.push(code);
  if(code===q.targetTerrainCode)throw Error('Ignored search override');
  return map.shotClassAt(code);
 }};
 expect(originalSearchedAutomaticLaunch(q,searched,guarded,middleEffects(q)))
  .toEqual({...e,state:{...e.state,landing:{x:123,z:456}}});
 expect(reads).not.toContain(q.targetTerrainCode);
 expect(map.shotClassAt(q.targetTerrainCode)).toBe(0);
});
