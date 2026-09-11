import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchRecovery} from '../src/simulation/original-launch-recovery.js';
const base={heading:0,angularOffset:1200,actorFlags:0,lie:3,strength:100,level:2,actorId:154,targetArgument:0,
 skillMask:7,actorClass:1,recoveryValue:255,mode:1,shotCounter:0,baseSpeed:3000,seed:2002};
test('accuracy and recovery results match executable fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-recovery.json',import.meta.url),'utf8'));
 for(const [q,e] of rows){const {draws,...actual}=originalLaunchRecovery(q,lie=>q.classes[lie+1]);expect(actual).toEqual(e);}
});
test('successful recovery selects lie two and marks the actor',()=>{
 const result=originalLaunchRecovery(base,()=>1);expect(result.lie).toBe(2);expect(result.actorFlags&0x400000).toBeTruthy();expect(result.draws).toBe(1);
});
test('short-shot identity exception divides curvature instead of changing heading',()=>{
 const result=originalLaunchRecovery({...base,strength:74,actorId:0,targetArgument:0,level:0,actorClass:0},()=>0);
 expect(result.angularOffset).toBe(400);expect(result.heading).toBe(0);
 const boundary=originalLaunchRecovery({...base,strength:75,actorId:0,targetArgument:0,level:0,actorClass:0},()=>0);
 expect(boundary.angularOffset).toBe(1200);
});
test('actor flag and late shot counter select minus-one lie after recovery',()=>{
 expect(originalLaunchRecovery({...base,actorFlags:1,shotCounter:7},()=>1).lie).toBe(-1);
 expect(originalLaunchRecovery({...base,actorFlags:1,shotCounter:6},()=>1).lie).toBe(2);
});
test('bypassed metadata and RNG remain untouched',()=>{
 const result=originalLaunchRecovery({...base,actorClass:0},()=>{throw Error('Unexpected terrain read');});
 expect(result.seed).toBe(base.seed);expect(result.draws).toBe(0);
});
test('late-shot comparison treats the original counter as a signed byte',()=>{
 expect(originalLaunchRecovery({...base,actorFlags:1,shotCounter:127},()=>1).lie).toBe(-1);
 expect(originalLaunchRecovery({...base,actorFlags:1,shotCounter:128},()=>1).lie).toBe(2);
 expect(originalLaunchRecovery({...base,actorFlags:1,shotCounter:255},()=>1).lie).toBe(2);
});
