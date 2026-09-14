import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkExplanationDisplay} from '../src/simulation/original-remark-explanation.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-explanation-display.json',import.meta.url)));
test('popup style and successful-display bookkeeping match original execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalRemarkExplanationDisplay(q,(e,s)=>({result:q.popupResult,state:q.mutate?{...s,originalClock:9876,explanationMaskLow:16,explanationMaskHigh:32,lastExplanationClock:42,sourceText:'Popup changed text'}:s}))).toEqual(expected);expect(q).toEqual(before);}
});
test('failed popup retains retry eligibility; success uses current callback clock and masks',()=>{
 const [base]=rows.find(([q,r])=>r.events.length>0);const q={...structuredClone(base),kind:65};
 const failed=originalRemarkExplanationDisplay(q,(e,s)=>({state:s,result:0}));expect(failed.state).toEqual(q.state);
 const succeeded=originalRemarkExplanationDisplay(q,(e,s)=>({state:{...s,originalClock:5000,explanationMaskHigh:8},result:1}));
 expect(succeeded.state.lastExplanationClock).toBe(5000);expect(succeeded.state.explanationMaskHigh).toBe(10);
});
test('disabled or empty explanations require no popup callback',()=>{
 for(const [q,r] of rows.filter(([,r])=>r.events.length===0))expect(originalRemarkExplanationDisplay(q)).toEqual(r);
 const [q]=rows.find(([,r])=>r.events.length>0);expect(()=>originalRemarkExplanationDisplay(q)).toThrow('requires a resolver');
 expect(()=>originalRemarkExplanationDisplay(q,async(e,s)=>({state:s,result:1}))).toThrow('synchronous');
});
