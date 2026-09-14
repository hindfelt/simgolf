import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPopupCompleteExplanation} from '../src/simulation/original-complete-explanation.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-popup-explanation.json',import.meta.url)));
for(const [q,out] of rows){for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);}
test('complete explanations with native name and popup helpers match original execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalPopupCompleteExplanation(q,(e,s)=>{
  if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
  return {...s,remarkStyle:91,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[0]+','+e.args[1]};
 })).toEqual(expected);expect(q).toEqual(before);}
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(65);
});
test('native composition covers accepted popups and rejections without RNG or cooldown consumption',()=>{
 const shown=rows.filter(([,r])=>r.popupRandomDraws===2),rejected=rows.filter(([,r])=>r.events.some(e=>e.address===0x40c7f0)&&r.popupRandomDraws===0);
 expect(shown.length).toBeGreaterThan(0);expect(rejected.length).toBeGreaterThan(0);
 for(const [q,r] of shown){expect(r.state.popupText).toBe(r.state.sourceText);expect(r.state.lastExplanationClock).toBe(q.state.originalClock);}
 for(const [q,r] of rejected){expect(r.state.seed).toBe(q.state.seed);expect(r.state.lastExplanationClock).toBe(q.state.lastExplanationClock);expect(r.state.popupText).toBe(q.state.popupText);}
});
