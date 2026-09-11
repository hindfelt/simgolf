import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkPreamble} from '../src/simulation/original-remark-preamble.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-preamble.json',import.meta.url)));
test('pre-outcome changes and pending effects match original executable fixtures',()=>{
 for(const [raw,expected] of rows){const q={...raw,actor:Uint8Array.from(raw.actor),before:Uint8Array.from(raw.before)},before=structuredClone(q);const got=originalRemarkPreamble(q);got.actor=[...got.actor];expect(got).toEqual(expected);expect(q).toEqual(before);}
 expect(new Set(rows.map(([,r])=>r.next))).toEqual(new Set(['return','outcome','effect']));
});
test('record restoration precedes status checks and pending effect selection',()=>{
 const actor=new Uint8Array(256),before=new Uint8Array(256);before[0x18]=1;before[0x36]=5;new DataView(before.buffer).setUint32(0x10,0x40000,true);
 const q={actor,before,actorId:1,selectedActorId:1,kind:40,delta:-1};
 const result=originalRemarkPreamble(q);
 expect(result.next).toBe('effect');expect(result.event.args).toEqual([48,100,0,0,0]);expect(result.actor[0x36]).toBe(0);
 expect(actor[0x18]).toBe(0);expect(before[0x36]).toBe(5);
 expect(originalRemarkPreamble({...q,kind:48,delta:0}).next).toBe('return');
});
test('special negative streaks reset to one, with signed-byte overflow preserved',()=>{
 const actor=new Uint8Array(256);actor[0x18]=1;actor[0x36]=254;
 const q={actor,kind:2,delta:-1,actorId:0,selectedActorId:1};
 expect(originalRemarkPreamble(q).actor[0x36]).toBe(1);
 expect(originalRemarkPreamble({...q,kind:4}).actor[0x36]).toBe(253);
 actor[0x36]=127;expect(originalRemarkPreamble({...q,kind:4,delta:1}).actor[0x36]).toBe(128);
});
