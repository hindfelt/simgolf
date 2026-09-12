import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkEntry} from '../src/simulation/original-remark-entry.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-entry.json',import.meta.url)));
test('remark eligibility and remapping match native executable fixtures',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalRemarkEntry(q)).toEqual(expected);expect(q).toEqual(before);}
 expect(rows.some(([,r])=>!r.allowed)).toBe(true);
 expect(rows.some(([q,r])=>r.allowed&&r.kind!==q.kind)).toBe(true);
});
test('signed shot counters and strict completion/score gates are preserved',()=>{
 const q={actorId:0,shotCounter:255,globalFlags:0,kind:19,actorStatus:0,holeCompletions:10,holeStrokes:6,par:4,holeFlags:4};
 expect(originalRemarkEntry(q)).toEqual({allowed:true,kind:23});
 expect(originalRemarkEntry({...q,holeStrokes:5})).toEqual({allowed:true,kind:19});
 expect(originalRemarkEntry({...q,holeCompletions:9}).kind).toBe(19);
 expect(originalRemarkEntry({...q,actorStatus:0x20}).kind).toBe(19);
 expect(originalRemarkEntry({...q,holeFlags:8,holeStrokes:3}).kind).toBe(23);
 expect(originalRemarkEntry({...q,shotCounter:10}).allowed).toBe(false);
});
