import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAudibleRemarkAdjustment} from '../src/simulation/original-remark-adjustment.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-audible-remark.json',import.meta.url)));
function context(q){return ()=>({camera:q.camera,zoom:q.zoom,map:{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]}});}
function input(row){const q=structuredClone(row);q.state.actor=Uint8Array.from(q.state.actor);q.before=Uint8Array.from(q.before);return q;}
test('reaction selection, real projection/speech and outcome share exact original state and RNG',()=>{
 for(const [row,expected] of rows){
  const q=input(row),before=structuredClone(q);
  const got=originalAudibleRemarkAdjustment(q,context(q),(_event,state)=>{
   if(q.effectMutation){state.actor[0x18]=0x40;state.seed=777;}return state;
  });
  got.state.actor=[...got.state.actor];expect(got).toEqual(expected);expect(q).toEqual(before);
 }
});
test('only actual playback is delegated; the caller cannot substitute projection or RNG outcomes',()=>{
 const [row]=rows.find(([,r])=>r.soundEvents.length>0),q=input(row);let count=0;
 originalAudibleRemarkAdjustment(q,context(q),(event,state)=>{expect(event.address).toBe(0x447a30);count++;return state;});
 expect(count).toBeGreaterThan(0);
 expect(()=>originalAudibleRemarkAdjustment(q,context(q))).toThrow('requires an explicit resolver');
 expect(()=>originalAudibleRemarkAdjustment(q,context(q),async(_event,state)=>state)).toThrow('synchronous');
});
