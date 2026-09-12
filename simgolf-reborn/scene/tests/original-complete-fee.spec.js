import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCompleteFee} from '../src/simulation/original-complete-fee.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-complete-fee.json',import.meta.url)));
for(const [q,out] of rows){for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}for(const id in q.holeRecords)q.holeRecords[id]=Uint8Array.from(q.holeRecords[id]);}
const speech=(q)=>(e,s)=>q.speechMutation?{...s,feeUnits:77,seed:999}:s;
test('assessment through settlement matches uninterrupted native execution',()=>{
 for(const [q,out] of rows){const before=structuredClone(q);expect(originalCompleteFee(q,speech(q))).toEqual(out);expect(q).toEqual(before);}
});
test('settlement can read changed control state after speech, without running early',()=>{
 const q=structuredClone(rows.find(([q])=>q.profileTiers[0]===4&&!q.globalFlags)[0]);let played=false;
 const r=originalCompleteFee(q,(e,s)=>{played=true;return {...s,feeUnits:77,seed:999};},s=>{expect(played).toBe(true);expect(s.feeUnits).toBe(77);return {globalFlags:0x200000,state:s};});
 expect(r.posted).toBe(false);expect(r.state.cashUnits).toBe(q.state.cashUnits);expect(r.state.seed).toBe(999);expect(r.events.map(e=>e.address)).toEqual([0x40c1f0]);
 expect(()=>originalCompleteFee(q,speech(q),async()=>({state:q.state}))).toThrow('synchronous');
});
