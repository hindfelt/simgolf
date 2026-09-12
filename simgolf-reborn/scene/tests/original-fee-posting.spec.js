import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalFeePosting,originalMoneyNotice} from '../src/simulation/original-fee-posting.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-fee-posting.json',import.meta.url)));
for(const [q,out] of rows)for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}
test('fee ledgers and notices match contiguous native posting including integer wrapping',()=>{
 for(const [q,out] of rows){const before=structuredClone(q);expect(originalFeePosting(q)).toEqual(out);expect(q).toEqual(before);}
});
test('disabled money notices do not suppress the actual fee ledgers',()=>{
 const [q,out]=rows.find(([q])=>q.state.feeUnits===10&&q.globalFlags===0x1000000);
 expect(out.state.cashUnits).not.toBe(q.state.cashUnits);expect(out.state.moneyNotices).toEqual(q.state.moneyNotices);expect(out.state.moneyNoticeIndex).toBe(q.state.moneyNoticeIndex);
});
test('zero notices need no queue and explicit hole notices subtract their units',()=>{
 expect(originalMoneyNotice({units:0,state:{},globalFlags:0})).toEqual({state:{}});
 const [q]=rows.find(([q])=>q.state.moneyNoticeIndex===7),state=structuredClone(q.state),id=Object.keys(state.holeRecords)[0];
 new DataView(state.holeRecords[id].buffer).setInt32(0x1f8,20,true);
 const out=originalMoneyNotice({state,globalFlags:0,units:5,x:1,z:2,holeIndex:Number(id)}).state;
 expect(new DataView(out.holeRecords[id].buffer).getInt32(0x1f8,true)).toBe(15);expect(out.moneyNoticeIndex).toBe(0);expect(out.moneyNotices[7]).toEqual({units:5,x:1,z:2,ticks:24});
});
