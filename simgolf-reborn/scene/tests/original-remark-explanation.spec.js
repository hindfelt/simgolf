import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkExplanationGate} from '../src/simulation/original-remark-explanation.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-explanation.json',import.meta.url)));
for(const [q] of rows){for(const id in q.state.actors)q.state.actors[id]=Uint8Array.from(q.state.actors[id]);for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);}
test('explanation cooldown, masks, screen limits and pronouns match original execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalRemarkExplanationGate(q)).toEqual(expected);expect(q).toEqual(before);}
 expect(rows.some(([,r])=>r.next==='explanation')).toBe(true);
});
test('kind50 exits before profile lookup; higher kinds use the original wrapped mask bits',()=>{
 expect(originalRemarkExplanationGate({kind:50})).toEqual({next:'return',pronoun:null,events:[]});
 const [base]=rows.find(([q,r])=>r.next==='explanation');const q=structuredClone(base);q.kind=64;q.state.explanationMaskHigh=1;
 expect(originalRemarkExplanationGate(q).next).toBe('return');q.state.explanationMaskHigh=2;expect(originalRemarkExplanationGate(q).next).toBe('explanation');
 q.kind=65;expect(originalRemarkExplanationGate(q).next).toBe('return');
});
