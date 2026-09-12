import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteDiagnostics,originalRouteFinish} from '../src/simulation/original-route-finish.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-finish.json',import.meta.url),'utf8'));
test('route diagnostics and completion match original executable fixtures',()=>{
 for(const [q,d,e] of rows){const before=JSON.stringify(q);expect(originalRouteDiagnostics(q)).toBe(d);expect(originalRouteFinish({...q,diagnostics:d})).toEqual(e);expect(JSON.stringify(q)).toBe(before);}
});
test('no winner falls back to cup and clears curve/corner mode',()=>{
 const q={...rows[0][0],winner:{target:{x:-1,z:10},curve:-1,landingFlag:1},cornerTarget:1,diagnostics:2};
 const a=originalRouteFinish(q);expect(a.target).toEqual(q.cup);expect(a.curve).toBe(0);expect(a.cornerTarget).toBe(0);expect(a.diagnostics).toBe(2);
});
test('cleanup clears temporary search flag and preserves only mode two',()=>{
 for(const mode of [0,1,2,3]){const a=originalRouteFinish({...rows[0][0],worldFlags:0xffffffff,mode});expect(a.worldFlags).toBe(0xff7fffff);expect(a.mode).toBe(mode===2?2:0);expect(a.candidateSkillMask).toBe(7);}
});
test('four-sample diagnostic gives distance spread priority over heading spread',()=>{
 const q={samples:4,diagnostics:7,maxDistance:76,minDistance:0,maxHeading:0x15555556,minHeading:0};
 expect(originalRouteDiagnostics(q)).toBe(1);expect(originalRouteDiagnostics({...q,maxDistance:75})).toBe(2);
 expect(originalRouteDiagnostics({...q,maxDistance:75,maxHeading:0x15555555})).toBe(0);
 expect(originalRouteDiagnostics({...q,samples:8})).toBe(7);
});
