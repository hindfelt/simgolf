import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAudibleHoleCompletionPrefix} from '../src/simulation/original-audible-hole-completion-prefix.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-audible-hole-completion-prefix.json',import.meta.url)));
for(const [q,out] of rows){for(const s of [q.state,out.state]){for(const field of ['actors','holeRecords','completionProfiles'])for(const id in s[field])s[field][id]=Uint8Array.from(s[field][id]);for(const field of ['completionMarkers','terrain','tileGrowth','positive','negative'])s[field]=Uint8Array.from(s[field]);s.tileFlags=Uint16Array.from(s.tileFlags);s.performance=Int32Array.from(s.performance);}for(const field of ['profileRecords','holeRecords','profileHistory'])for(const id in q[field])q[field][id]=Uint8Array.from(q[field][id]);}
test('score and fees through actual completion remark and reset match original execution',()=>{
 const kinds=new Set();let skipped=0;
 for(const [q,out] of rows){const before=structuredClone(q);const r=originalAudibleHoleCompletionPrefix(q,{
  resolvePhrase:(e,s)=>{if(e.address===0x466fb0)return {...s,sourceText:originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]})};return {...s,remarkStyle:91,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[0]+','+e.args[1]};},
  audioContext:()=>({camera:q.camera,zoom:q.zoom,map:{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]}}),playback:(e,s)=>s
 });expect(r.state).toEqual(out.state);expect(q).toEqual(before);if(r.remarks.length)kinds.add(r.remarks[0].kind);else skipped++;}
 expect(kinds).toEqual(new Set([19,23]));expect(skipped).toBeGreaterThan(0);
});
