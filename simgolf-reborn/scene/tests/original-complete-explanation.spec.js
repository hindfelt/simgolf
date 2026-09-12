import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCompleteExplanation,originalDescribedCompleteExplanation} from '../src/simulation/original-complete-explanation.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-complete-explanation.json',import.meta.url)));
for(const [q,out] of rows){for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);}
test('complete explanation flow matches uninterrupted original execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalCompleteExplanation(q,(e,s)=>({...s,remarkStyle:91,sourceText:s.sourceText.split('\0',1)[0]+(e.address===0x466fb0?'Name'+e.args[0]:'Place'+e.args[0]+','+e.args[1])}),undefined,(e,s)=>({state:s,result:q.popupResult}))).toEqual(expected);expect(q).toEqual(before);}
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(65);
});
test('actual name helper completes the quoted remark and records successful display',()=>{
 const q=structuredClone(rows.find(([q])=>q.kind===1&&q.state.originalClock===1000&&q.state.interfaceFlags===4)[0]);q.value=-1;q.selectedDelta=1;q.profilePhrases=[['Tough shot']];
 const result=originalDescribedCompleteExplanation(q,{profileNames:['Gary','Bob']},undefined,undefined,(e,s)=>{
  expect(e.args).toEqual([0x80000288,-8,0]);expect(s.sourceText).toBe("'Tough shot' Gary has successfully made a tough-looking shot and is enjoying your course.");return {state:s,result:1};
 });
 expect(result.state.explanationMaskLow).toBe(2);expect(result.state.lastExplanationClock).toBe(1000);
 expect(result.locationEvents).toEqual([]);
});
