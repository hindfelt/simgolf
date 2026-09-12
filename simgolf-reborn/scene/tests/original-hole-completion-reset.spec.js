import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalHoleCompletionReset} from '../src/simulation/original-hole-completion-reset.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-hole-completion-reset.json',import.meta.url)));
for(const [q,out] of rows)for(const s of [q.state,out.state]){for(const key of ['actors','holeRecords','completionProfiles'])for(const id in s[key])s[key][id]=Uint8Array.from(s[key][id]);s.completionMarkers=Uint8Array.from(s.completionMarkers);}
test('post-remark completion resets match original execution without mutating input',()=>{
 for(const [q,out] of rows){const before=structuredClone(q);expect(originalHoleCompletionReset(q)).toEqual(out);expect(q).toEqual(before);}
});
test('non-advancing clock requires no hole timing record and still records the score',()=>{
 const q=structuredClone(rows.find(([q])=>q.clock<=new DataView(q.state.actors[q.actorId].buffer).getInt32(0xc0,true))[0]);
 const actor=q.state.actors[q.actorId],stroke=actor[0x22],hole=actor[0x21],profile=new DataView(actor.buffer).getInt16(0xb6,true);delete q.state.holeRecords;
 const r=originalHoleCompletionReset(q);expect(r.state.completionProfiles[profile][hole+20]).toBe(stroke);expect(r.state.actors[q.actorId][0x22]).toBe(0);
});
