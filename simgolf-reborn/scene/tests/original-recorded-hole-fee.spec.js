import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRecordedHoleFee} from '../src/simulation/original-recorded-hole-fee.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-recorded-hole-fee.json',import.meta.url)));
for(const [q,out] of rows){for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);s.performance=Int32Array.from(s.performance);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}for(const id in q.holeRecords)q.holeRecords[id]=Uint8Array.from(q.holeRecords[id]);}
const speech=q=>(e,s)=>q.speechMutation?{...s,feeUnits:77,seed:999}:s;
test('score recording through fee posting matches uninterrupted original instructions',()=>{
 for(const [q,out] of rows){const before=structuredClone(q);expect(originalRecordedHoleFee(q,speech(q))).toEqual(out);expect(q).toEqual(before);}
});
test('suppressed payment retains the completed score and statistical updates',()=>{
 const [q]=rows.find(([q])=>(q.globalFlags&0x200000)&&q.state.actors[0][0x18]===0&&q.state.actors[0][0x22]!==0);
 const r=originalRecordedHoleFee(q,speech(q)),actor=r.state.actors[0];
 expect(r.posted).toBe(false);expect(r.state.cashUnits).toBe(q.state.cashUnits);expect(actor[actor[0x21]+0x23]).toBe(actor[0x22]);expect(r.state.performance).not.toEqual(q.state.performance);
});
test('post-speech snapshot sees score recording before it chooses settlement controls',()=>{
 const [q]=rows.find(([q])=>q.profileTiers[0]===4);
 originalRecordedHoleFee(q,speech(q),s=>{expect(s.actors[0][s.actors[0][0x21]+0x23]).toBe(s.actors[0][0x22]);return {state:s,globalFlags:0x200000};});
});
