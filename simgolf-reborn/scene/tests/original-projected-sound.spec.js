import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPositionalSoundAt} from '../src/simulation/original-positional-sound.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-projected-sound.json',import.meta.url)));
test('complete projection and positional sound match contiguous executable fixtures',()=>{
 for(const [q,expected] of rows){
  const before=structuredClone(q);
  const map={flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]};
  const got=originalPositionalSoundAt(q,map,(_event,state)=>q.mutate?{...state,seed:777,queued:99,sequenceIndex:123}:state);
  expect(got).toEqual(expected);expect(q).toEqual(before);
 }
});
