import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalHoleDescription} from '../src/simulation/original-hole-description.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-hole-description.json',import.meta.url)));
for(const [q] of rows)for(const id in q.holeRecords)q.holeRecords[id]=Uint8Array.from(q.holeRecords[id]);
test('hole descriptions match native custom, par-based and numeric naming',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalHoleDescription(q)).toEqual(expected);expect(q).toEqual(before);}
});
test('an empty custom name still overrides the built-in name',()=>{
 const next=new Uint8Array(520);next[0]=1;
 const result=originalHoleDescription({holeIndex:2,holeRecords:{3:next},holeNameOffsets:{2:0},holeNameStrings:{0:''},state:{sourceText:'Near '}});
 expect(result.state.sourceText).toBe('Near ');expect(result.events).toEqual([{address:0x45b2c0,args:[2]}]);
});
