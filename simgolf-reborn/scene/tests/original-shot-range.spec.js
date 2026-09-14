import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalShotRange} from '../src/simulation/original-shot-range.js';
const input={actorId:154,skillMask:3,difficulty:1,level:1,surface:7,shot:0,
 professional:false,abilityFlags:0,power:5,longDrive:5,boost:0,lengthBonus:0,shotClass:0};
test('range matches independent original x86 fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-shot-range.json',import.meta.url),'utf8'));
 for(const [q,result] of rows)expect(originalShotRange(q),JSON.stringify(q)).toBe(result);
});
test('design actor overrides map lie, but later shots have a nonzero lie penalty',()=>{
 expect(originalShotRange(input)).toBe(216);
 expect(originalShotRange({...input,shot:1,shotClass:1})).toBe(152);
 expect(originalShotRange({...input,actorId:151,shotClass:0})).toBe(173);
});
test('professional long-drive bonus applies only on the effective zero lie',()=>{
 const pro={...input,professional:true,abilityFlags:3,power:15,longDrive:10};
 expect(originalShotRange(pro)).toBe(286);
 expect(originalShotRange({...pro,shot:1})).toBe(205);
 expect(originalShotRange({...pro,lengthBonus:4})).toBe(330);
});
test('range accepts the whole original shot-counter byte',()=>{
 expect(originalShotRange({...input,shot:255})).toBe(originalShotRange({...input,shot:1}));
 expect(()=>originalShotRange({...input,shot:256})).toThrow();
});
