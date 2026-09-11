import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalClubDrift} from '../src/simulation/original-club-drift.js';
const base={angularOffset:1200,actorClass:1,activeActor:false,level:2,attitude:2,club:4,shotCounter:0,driverValue:2,ironValue:2,drawValue:3,fadeValue:9,curve:2,mode:0};
test('original club drift fixtures include signed overflow and all branch classes',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-club-drift.json',import.meta.url),'utf8'));
 for(const [q,e] of rows)expect(originalClubDrift(q)).toEqual(e);
});
test('actor class zero bypasses modifiers while active actor takes priority',()=>{
 expect(originalClubDrift({...base,actorClass:0})).toEqual({angularOffset:1200,modifier:-3});
 expect(originalClubDrift({...base,actorClass:32,activeActor:true,level:0})).toEqual({angularOffset:600,modifier:-1});
 expect(originalClubDrift({...base,actorClass:32,level:0})).toEqual({angularOffset:2400,modifier:-1});
});
test('driver adjustment only runs for the initial shot; iron adjustment still applies later',()=>{
 expect(originalClubDrift({...base,club:3,shotCounter:1,driverValue:8})).toEqual({angularOffset:1200,modifier:-1});
 expect(originalClubDrift({...base,club:4,shotCounter:1,ironValue:8})).toEqual({angularOffset:600,modifier:7});
});
test('draw and fade use different values; straight shot reduction skips mode three',()=>{
 expect(originalClubDrift({...base,curve:1})).toEqual({angularOffset:1200,modifier:4});
 expect(originalClubDrift({...base,curve:-1})).toEqual({angularOffset:600,modifier:10});
 expect(originalClubDrift({...base,curve:0})).toEqual({angularOffset:1028,modifier:4});
 expect(originalClubDrift({...base,curve:0,mode:3})).toEqual({angularOffset:1200,modifier:1});
});
