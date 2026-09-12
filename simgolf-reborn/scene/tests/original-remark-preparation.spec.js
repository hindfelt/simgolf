import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkPreparation} from '../src/simulation/original-remark-preparation.js';
import {originalPreparedRemarkDispatch} from '../src/simulation/original-remark-dispatch.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-preparation.json',import.meta.url)));
for(const [q,out] of rows){for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);if(out.before)out.before=Uint8Array.from(out.before);}
test('speech ordering, repeat suppression, history and voice offset match native execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalRemarkPreparation(q,(e,s)=>{if(q.mutate){s.actors[q.actorId][0x70]=35;s.actors[q.actorId][0x21]=5;}return s;})).toEqual(expected);expect(q).toEqual(before);}
});
test('message dispatch updates pending state before recording history',()=>{
 const actor=new Uint8Array(256);actor[0x21]=2;
 const q={actorId:0,kind:20,value:-1,globalFlags:0,requestCodes:[20,-1],profilePhrases:[['Personal']],profileRecords:{0:new Uint8Array(560)},state:{actors:{0:actor},sourceText:'',displayText:'',priority:0,requestValues:Array(66).fill(0)}};
 const result=originalPreparedRemarkDispatch(q,(e,s)=>({...s,sourceText:'Gary'}));
 expect(result.next).toBe('adjustment');expect(result.state.displayText).toBe('Gary (2): Personal');
 expect(result.before[0x84]).toBe(7);expect(result.before[0x70]).toBe(0);expect(result.state.actors[0][0x70]).toBe(20);expect(result.state.actors[0][0x7a]).toBe(23);
 expect(result.voiceOffset).toBe(0);
 q.globalFlags=0x2000000;expect(originalPreparedRemarkDispatch(q).state).toEqual(q.state);
});
