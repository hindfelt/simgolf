import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalHoleCompletionStats} from '../src/simulation/original-hole-completion-stats.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-hole-completion-stats.json',import.meta.url)));
test('score recording and statistical counters match native completion',()=>{
 for(const [q,out] of rows){for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);s.performance=Int32Array.from(s.performance);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}const before=structuredClone(q);expect(originalHoleCompletionStats(q)).toEqual(out);expect(q).toEqual(before);}
});
test('nonzero actor status records its score without reading statistical records',()=>{
 const actor=new Uint8Array(256);actor[0x18]=32;actor[0x21]=2;actor[0x22]=10;
 const result=originalHoleCompletionStats({actorId:0,state:{actors:{0:actor}}});
 expect(result.events).toEqual([]);expect(result.state.actors[0][0x25]).toBe(10);
});
