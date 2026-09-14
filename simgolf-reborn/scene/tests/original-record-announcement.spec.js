import {test,expect} from '@playwright/test';
import {originalRecordAnnouncement} from '../src/simulation/original-record-announcement.js';
import {originalRoundResultPrelude} from '../src/simulation/original-round-result-prelude.js';
function fixture(){const b=new Uint8Array(256);b[0x2c]=4;b[0x29]=18;for(let h=1;h<=18;h++)b[0x2b+h]=4;return {actorId:0,actors:[b],courseHoleCount:19,recordHolder:-1,scoreList:Int32Array.from([80,0,0,0,0,0,0,0,0,0]),sourceText:'Gary',totals:{playedStrokes:72,playedPar:72,completionBits:0},globalFlags:0,completionRecords:[new Uint8Array(44)],holeRecords:Array.from({length:20},()=>{const h=new Uint8Array(520);h[0]=4;return h;})};}
test('announcement assigns record ownership before presentation and appends native text',()=>{
 const s=fixture(),r=originalRecordAnnouncement(s,(_,state)=>{expect(state.recordHolder).toBe(256);return {state};});expect(r.announced).toBe(true);expect(r.state.sourceText).toBe('Gary has just set a new course record of 72 strokes for 18 holes! ');expect(r.totals.completionBits).toBe(1);expect(s.recordHolder).toBe(-1);
});
test('eligibility requires first-hole score, enough holes, no holder and a below-best score at or below par',()=>{
 for(const mutate of [s=>s.actors[0][0x2c]=0,s=>s.courseHoleCount=2,s=>s.recordHolder=0,s=>s.scoreList[0]=72,s=>s.totals.playedPar=71]){const s=fixture();mutate(s);expect(originalRecordAnnouncement(s).announced).toBe(false);}
});
test('composed result preserves native post-insertion comparison instead of inventing an announcement',()=>{
 const r=originalRoundResultPrelude(fixture(),(_,state)=>({state}));expect(r.state.scoreList[0]).toBe(72);expect(r.announced).toBe(false);expect(r.next).toBe('0x427d38');expect(r.state.recordHolder).toBe(-1);
});
