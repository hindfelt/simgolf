import {test,expect} from '@playwright/test';
import {originalRoundPerformance} from '../src/simulation/original-round-performance.js';
function fixture(){const b=new Uint8Array(256),r=new Uint8Array(44);r[0]=90;r[1]=253;r[2]=1;return {actorId:0,actors:[b],completionRecords:[r],difficulty:1,performanceBonus:0,courseHoleCount:19,periodIndex:1,cashTotal:200,secondaryBalance:0,totals:{completionBits:2,projectedStrokes:80,projectedRelative:0}};}
test('summary updates only header bytes and sets native threshold state',()=>{
 const s=fixture(),r=originalRoundPerformance(s),a=new DataView(r.state.actors[0].buffer);expect(r.state.completionRecords[0].slice(0,3)).toEqual(Uint8Array.from([80,255,1]));expect(a.getUint32(0x18,true)).toBe(0x80000000);expect(a.getInt16(0xa6,true)).toBe(-8);expect(s.completionRecords[0][0]).toBe(90);
});
test('high tiers and nonzero actor classes do not receive threshold flags',()=>{
 for(const variant of ['tier','class']){const s=fixture();s.totals.completionBits=100;if(variant==='tier')s.completionRecords[0][2]=5;else s.actors[0][0x20]=32;const r=originalRoundPerformance(s);expect(new DataView(r.state.actors[0].buffer).getUint32(0x18,true)).toBe(0);}
});
test('record hole flags contribute at the corrected header-relative offset',()=>{
 const s=fixture();s.completionRecords[0][21]=1;expect(originalRoundPerformance(s).performancePoints).toBe(3);s.completionRecords[0][21]=0;expect(originalRoundPerformance(s).performancePoints).toBe(2);
});
