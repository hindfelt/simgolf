import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteAssessment} from '../src/simulation/original-route-assessment.js';
import {originalRouteFollowup} from '../src/simulation/original-route-followup.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/original-route-assessment.json',import.meta.url),'utf8'));
const terrainAt=p=>{const code=fixture.grid[p.x*50+p.z];const [shotClass,kind]=fixture.metadata[code];return {code,shotClass,kind};};
test('complete route costs match original executable outputs',()=>{
 for(const [q,result] of fixture.rows)expect(originalRouteAssessment({...q,terrainAt}),JSON.stringify(q)).toBe(result);
});
test('original assessor supplies real costs to follow-up selection',()=>{
 const landing={x:25672,z:25963},cup={x:29,z:21};
 const assessShot=q=>originalRouteAssessment({...q,terrainAt});
 const costs=[0,-1,1].map(shape=>assessShot({landing,cup,range:199,shape,flag:0}));
 const result=originalRouteFollowup({score:10,samples:4,mode:0,skillMask:4,beyondTwoShots:false,
 lie:0,range:199,shot:1,remaining:200,landingClass:0,shapeMask:3,followupFlag:0,landing,cup,assessShot});
 expect(result.score).toBe(10+Math.trunc(Math.min(...costs)/2));
});
test('original temporary green class override does not mutate supplied metadata',()=>{
 const green={code:1,shotClass:4,kind:0};
 expect(originalRouteAssessment({landing:{x:26112,z:26112},cup:{x:26,z:25},range:200,shape:0,flag:0,terrainAt:()=>green})).toBe(0);
 expect(green.shotClass).toBe(4);
});
