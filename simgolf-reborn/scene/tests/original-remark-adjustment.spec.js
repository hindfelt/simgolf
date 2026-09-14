import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkAdjustment} from '../src/simulation/original-remark-adjustment.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-adjustment.json',import.meta.url)));
const decode=raw=>({...structuredClone(raw),before:Uint8Array.from(raw.before),state:{...structuredClone(raw.state),actor:Uint8Array.from(raw.state.actor)}});
const resolver=q=>(event,state)=>{
 const v=new DataView(state.actor.buffer);
 if(q.effectMutation){
  if(event.address===0x447a30){state.actor[0x18]=0x40;state.seed=777;}
  if(event.address===0x40c1f0){v.setInt16(0xb6,1,true);state.actor[0x1d]=99;}
  if(event.address===0x4a0000)state.actor[0x1e]=88;
 }
 return {state,result:event.address===0x46c140?q.voice:0};
};
test('all request branches compose with response state exactly as the native block',()=>{
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(66);
 for(const [raw,expected] of rows){const q=decode(raw),before=structuredClone(q);const got=originalRemarkAdjustment(q,resolver(q));got.state.actor=[...got.state.actor];expect(got).toEqual(expected);expect(q).toEqual(before);}
});
test('unresolved selection effects cannot produce an adjusted result',()=>{
 const q=decode(rows.find(([q])=>q.kind===6)[0]);
 expect(()=>originalRemarkAdjustment(q)).toThrow('requires an effect resolver');
 expect(()=>originalRemarkAdjustment(q,()=>({result:0}))).toThrow('Expected speculative state');
});
