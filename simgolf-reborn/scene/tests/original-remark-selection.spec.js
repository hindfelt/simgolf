import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkSelection} from '../src/simulation/original-remark-selection.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-selection.json',import.meta.url)));
const decode=raw=>({...structuredClone(raw),state:{...structuredClone(raw.state),actor:Uint8Array.from(raw.state.actor)}});
function resolve(q){return (event,state)=>{
 const v=new DataView(state.actor.buffer);
 if(q.mutate){
  if(event.address===0x46c140)v.setInt32(0,2048,true);
  if(event.address===0x40c1f0){v.setInt16(0xb6,1,true);state.actor[0x1d]=99;}
  if(event.address===0x4a0000)state.actor[0x1e]=88;
 }
 return {state,result:event.address===0x46c140?q.voice:0};
};}
test('all 65 request kinds and four difficulties match native switch execution',()=>{
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(66);
 expect(new Set(rows.map(([q])=>q.difficulty)).size).toBe(4);
 for(const [raw,expected] of rows){const q=decode(raw),before=structuredClone(q);const got=originalRemarkSelection(q,resolve(q));got.state.actor=[...got.state.actor];expect(got).toEqual(expected);expect(q).toEqual(before);}
});
test('required calls and original profile records cannot be silently omitted',()=>{
 const q=decode(rows[6][0]);expect(()=>originalRemarkSelection(q)).toThrow('requires an effect resolver');
 q.kind=18;new DataView(q.state.actor.buffer).setInt16(0xa6,8,true);q.state.profiles={};
 expect(()=>originalRemarkSelection(q,resolve(q))).toThrow('Missing original profile');
});
test('voice lookup reads original profile data without invoking a mutable resolver',()=>{
 const q=decode(rows[6][0]);q.mutate=true;
 const calls=[];const got=originalRemarkSelection(q,(event,state)=>{calls.push(event.address);return resolve(q)(event,state);});
 expect(calls).not.toContain(0x46c140);
 expect(got.events[1].args.slice(1,3)).toEqual([1024,3072]);
 expect(new DataView(got.state.actor.buffer).getInt32(0,true)).toBe(1024);
});
