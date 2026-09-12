import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalFeeSettlement} from '../src/simulation/original-fee-settlement.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-fee-settlement.json',import.meta.url)));
for(const [q,out] of rows)for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}
test('settlement gates, tutorial, popup RNG and ledgers match native execution',()=>{
 for(const [q,out] of rows){const before=structuredClone(q);expect(originalFeeSettlement(q)).toEqual(out);expect(q).toEqual(before);}
});
test('popup rejection still posts fees; settlement suppression touches nothing',()=>{
 const [q,out]=rows.find(([q,r])=>r.posted&&q.state.feeUnits===10&&q.state.popupMode===3&&r.events.some(e=>e.address===0x40c7f0));
 expect(out.popupRandomDraws).toBe(0);expect(out.state.totalFeeUnits).not.toBe(q.state.totalFeeUnits);
 expect(originalFeeSettlement({globalFlags:0x200000,state:{}})).toEqual({state:{},events:[],posted:false,popupRandomDraws:0});
});
test('nonzero ledger selection does not read the first-fee tutorial ledger',()=>{
 const q=structuredClone(rows.find(([q])=>q.state.feeLedgerIndex===1&&!q.globalFlags)[0]);delete q.state.feeLedger[0];
 expect(originalFeeSettlement(q).events.map(e=>e.address)).toEqual([0x40c580]);
});
