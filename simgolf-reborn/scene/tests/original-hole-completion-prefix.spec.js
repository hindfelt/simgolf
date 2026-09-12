import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalHoleCompletionPrefix} from '../src/simulation/original-hole-completion-prefix.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-hole-completion-prefix.json',import.meta.url)));
for(const [q,out] of rows){for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);s.performance=Int32Array.from(s.performance);s.completionProfiles[0]=Uint8Array.from(s.completionProfiles[0]);s.completionMarkers=Uint8Array.from(s.completionMarkers);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}for(const id in q.holeRecords)q.holeRecords[id]=Uint8Array.from(q.holeRecords[id]);}
test('score, fee, conditional remark and reset match continuous original execution',()=>{
 for(const [q,out] of rows){const before=structuredClone(q);const r=originalHoleCompletionPrefix(q,{playSpeech:(e,s)=>q.speechMutation?{...s,feeUnits:77,seed:999}:s,resolveRemark:(e,s)=>{expect(s.actors[0][0x23+s.actors[0][0x21]]).toBe(q.state.actors[0][0x22]);s.actors[0][0x22]=7;return {state:s};},readClock:()=>q.state.actors[0][0x84]===0?42:q.clock});expect(r).toEqual(out);expect(q).toEqual(before);}
});
