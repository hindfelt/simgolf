import {test,expect} from '@playwright/test';
import {originalRemarkRecordView,applyOriginalRemarkRecordView} from '../src/simulation/original-remark-record-view.js';
function fresh(){return {actors:Array.from({length:152},(_,i)=>Uint8Array.from({length:256},(_,j)=>(i+j)&255)),holes:Array.from({length:20},(_,i)=>Uint8Array.from({length:520},(_,j)=>(i+j)&255)),actorTail:Uint8Array.from([11,12,13,14,15,16,17,18,19]),holePrefix:Uint8Array.from([21,22,23,24,25,26,27,28]),seed:17};}
test('remark views map positions and holes to the same native bytes',()=>{
 const s=fresh(),r=originalRemarkRecordView(s);expect(r.actors[0][0]).toBe(s.actors[0][8]);expect(r.actors[0][33]).toBe(s.actors[0][41]);expect(r.actors[0].slice(248)).toEqual(s.actors[1].slice(0,8));expect(r.actors[151].slice(248)).toEqual(s.actorTail.slice(0,8));
 expect(r.holeRecords[0].slice(0,8)).toEqual(s.holePrefix);expect(r.holeRecords[1].slice(0,8)).toEqual(s.holes[0].slice(512));expect(r.holeRecords[1][8]).toBe(s.holes[1][0]);
 const restored=applyOriginalRemarkRecordView(s,r);expect(restored.actors).toEqual(s.actors);expect(restored.holes).toEqual(s.holes);expect(restored.actorTail).toEqual(s.actorTail);
});
test('reaction writes cross record boundaries without losing untouched edge bytes',()=>{
 const s=fresh(),before=structuredClone(s),r=originalRemarkRecordView(s);r.actors[0][248]=199;r.actors[151][255]=200;r.holeRecords[1][0]=201;r.holeRecords[0][0]=202;r.seed=99;
 const result=applyOriginalRemarkRecordView(s,r);expect(result.actors[1][0]).toBe(199);expect(result.actorTail[7]).toBe(200);expect(result.actorTail[8]).toBe(19);expect(result.holes[0][512]).toBe(201);expect(result.holePrefix[0]).toBe(202);expect(result.actors[0].slice(0,8)).toEqual(s.actors[0].slice(0,8));expect(result.holes[19].slice(512)).toEqual(s.holes[19].slice(512));expect(result.seed).toBe(99);expect(s).toEqual(before);
});
test('missing memory around the record tables fails explicitly',()=>{const s=fresh();s.actorTail=new Uint8Array(1);expect(()=>originalRemarkRecordView(s)).toThrow('actor tail boundary');});
