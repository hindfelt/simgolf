import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkOutcome} from '../src/simulation/original-remark-outcome.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-outcome.json',import.meta.url)));
function input(){return {kind:4,value:0,delta:-1,reactionMode:0,difficulty:3,globalFlags:0,terrainCode:2,state:{actor:new Uint8Array(256),seed:2002,holeTotal:0,remarkCount:0,remarkValue:0,tileFlags:0,tileGrowth:0,worldDirty:0,positive:0,negative:0}};}
test('original reaction outcomes match native actor, hole, terrain and RNG state',()=>{
 for(const [raw,expected] of rows){
  const q=structuredClone(raw);q.state.actor=Uint8Array.from(q.state.actor);const before=structuredClone(q);
  const got=originalRemarkOutcome(q);got.state.actor=[...got.state.actor];expect(got).toEqual(expected);expect(q).toEqual(before);
 }
 expect(rows.some(([,r])=>r.state.tileGrowth===1&&r.state.worldDirty===-1)).toBe(true);
});
test('first mild complaints can be suppressed while repeated complaints are retained',()=>{
 const q=input();expect(originalRemarkOutcome(q).delta).toBe(0);
 q.state.actor[0x71]=4;
 expect(originalRemarkOutcome(q).delta).toBe(-1);
 q.reactionMode=1;expect(originalRemarkOutcome(q).delta).toBe(0);
 q.reactionMode=2;q.state.actor[0x71]=0;expect(originalRemarkOutcome(q).delta).toBe(-1);
});
test('negative reduction, counters and growth exclusions follow original flags',()=>{
 const q=input();q.delta=-3;
 const view=new DataView(q.state.actor.buffer);view.setUint32(0x10,0x20000000,true);
 expect(originalRemarkOutcome(q).delta).toBe(-2);
 q.state.actor[0x18]=0x40;
 let result=originalRemarkOutcome(q);
 expect(result.delta).toBe(-3);expect(result.state.tileFlags).toBe(0x4800);expect(result.state.negative).toBe(1);
 q.globalFlags=0x4000000;expect(originalRemarkOutcome(q).state.tileGrowth).toBe(0);
 q.globalFlags=0;q.terrainCode=17;expect(originalRemarkOutcome(q).state.tileGrowth).toBe(0);
});
test('kind 64 counter aliases the signed hole total, including overflow',()=>{
 const q=input();q.kind=64;q.delta=1;q.state.holeTotal=32767;q.state.remarkCount=32767;
 const r=originalRemarkOutcome(q);expect(r.state.holeTotal).toBe(-32767);expect(r.state.remarkCount).toBe(32769);
 q.state.remarkCount=5;expect(()=>originalRemarkOutcome(q)).toThrow('Aliased');
});
