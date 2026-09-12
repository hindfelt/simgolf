import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalFeeAssessment} from '../src/simulation/original-fee-assessment.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-fee-assessment.json',import.meta.url)));
test('fee assessment matches original signed arithmetic, bonuses and post-speech state',()=>{
 for(const [q,out] of rows){
  for(const s of [q.state,out.state])s.actors[0]=Uint8Array.from(s.actors[0]);q.holeRecords[2]=Uint8Array.from(q.holeRecords[2]);
  const before=structuredClone(q);expect(originalFeeAssessment(q,(e,s)=>({...s,feeUnits:q.mutation?77:s.feeUnits}))).toEqual(out);expect(q).toEqual(before);
 }
});
test('fee assessment requires explicit speech resolution and retains negative units',()=>{
 const q=structuredClone(rows.find(([q])=>q.profileTiers[0]===4)[0]);q.state.actors[0]=Uint8Array.from(q.state.actors[0]);q.holeRecords[2]=Uint8Array.from(q.holeRecords[2]);
 expect(()=>originalFeeAssessment(q)).toThrow('requires a resolver');expect(()=>originalFeeAssessment(q,async(e,s)=>s)).toThrow('synchronous');
 q.profileTiers[0]=0;q.reactionMode=0;q.feeBonus=0;q.holeRecords[2].fill(0);
 expect(originalFeeAssessment(q).state.feeUnits).toBe(-32768);
});
