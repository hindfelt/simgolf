import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchVariation} from '../src/simulation/original-launch-variation.js';
const base={globalFlags:0,skillMask:7,difficulty:0,actorClass:0,abilityFlags:0,abilityValue:0,targetFlags:0,attitude:2,seed:2002};
test('original variation outputs and random state match executable fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-variation.json',import.meta.url),'utf8'));
 for(const [q,expected] of rows){const {budget,draws,...actual}=originalLaunchVariation(q);expect(actual).toEqual(expected);expect(draws).toBe(1);}
});
test('difficulty modifier respects skill and actor-class exclusions',()=>{
 expect(originalLaunchVariation({...base,difficulty:3}).budget).toBe(40);
 expect(originalLaunchVariation({...base,difficulty:3,actorClass:0x20}).budget).toBe(20);
 expect(originalLaunchVariation({...base,difficulty:3,skillMask:3}).budget).toBe(20);
});
test('target reduction and attitude halving precede random bound calculation',()=>{
 expect(originalLaunchVariation({...base,targetFlags:128,attitude:1}).budget).toBe(5);
 expect(originalLaunchVariation({...base,targetFlags:128,attitude:1}).bound).toBe(2);
 const zero=originalLaunchVariation({...base,globalFlags:1,targetFlags:128});
 expect(zero.bound).toBe(0);expect(zero.variation).toBe(4);expect(zero.draws).toBe(1);expect(zero.seed).not.toBe(base.seed);
});
test('serialized raw inputs reproduce the draw exactly',()=>{
 expect(originalLaunchVariation(JSON.parse(JSON.stringify(base)))).toEqual(originalLaunchVariation(base));
});
