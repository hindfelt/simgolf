import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAfterFeeCompletion} from '../src/simulation/original-after-fee-completion.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-after-fee-completion.json',import.meta.url)));
for(const [q,out] of rows)for(const s of [q.state,out.state]){for(const key of ['actors','holeRecords','completionProfiles'])for(const id in s[key])s[key][id]=Uint8Array.from(s[key][id]);s.completionMarkers=Uint8Array.from(s.completionMarkers);}
test('conditional remark and reset match original instructions with a controlled remark',()=>{
 for(const [q,out] of rows){const before=structuredClone(q);const r=originalAfterFeeCompletion(q,(e,s)=>{s.actors[q.actorId][0x22]=7;return {state:s};},()=>q.state.actors[q.actorId][0x84]===0?42:q.clock);expect(r).toEqual(out);expect(q).toEqual(before);}
});
test('remark completes before clock refresh and stroke clearing',()=>{
 const q=rows.find(([q])=>q.state.actors[q.actorId][0x84]===0)[0];let called=false;
 originalAfterFeeCompletion(q,(event,state)=>{expect(state.actors[q.actorId][0x22]).toBe(q.state.actors[q.actorId][0x22]);expect(event.args.slice(0,2)).toEqual([q.actorId,19]);state.actors[q.actorId][0x22]=7;called=true;return {state};},state=>{expect(called).toBe(true);expect(state.actors[q.actorId][0x22]).toBe(7);return 42;});
});
test('skip branch needs no resolver; async remark and clock states are rejected',()=>{
 const skip=rows.find(([q])=>q.state.actors[q.actorId][0x84]!==0)[0];expect(()=>originalAfterFeeCompletion(skip)).not.toThrow();
 const q=rows.find(([q])=>q.state.actors[q.actorId][0x84]===0)[0];expect(()=>originalAfterFeeCompletion(q,async(e,state)=>({state}))).toThrow('synchronous');expect(()=>originalAfterFeeCompletion(skip,undefined,async()=>42)).toThrow('clock');
});
