import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchDrift} from '../src/simulation/original-launch-drift.js';
const base={mode:0,attitude:2,terrainCode:2,actorClass:0,skillMask:0,actorFlags:0,accuracySetting:0,level:2,seed:2002};
test('angular drift and RNG match original executable fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-drift.json',import.meta.url),'utf8'));
 for(const [q,expected] of rows){const {draws,...actual}=originalLaunchDrift(q);expect(actual).toEqual(expected);expect(draws).toBe(q.mode<2?1:0);}
});
test('modes two and three preserve RNG while mode one divides initial drift',()=>{
 for(const mode of [2,3])expect(originalLaunchDrift({...base,mode})).toEqual({angularOffset:0,seed:base.seed,draws:0});
 const normal=originalLaunchDrift(base),reduced=originalLaunchDrift({...base,mode:1});
 expect(reduced.angularOffset).toBe(Math.trunc(normal.angularOffset/3));expect(reduced.seed).toBe(normal.seed);
});
test('negative attitude amplification saturates and preserves terrain distinction',()=>{
 const severe=originalLaunchDrift({...base,attitude:-3});
 expect(originalLaunchDrift({...base,attitude:-128})).toEqual(severe);
 expect(Math.abs(originalLaunchDrift({...base,attitude:-3,terrainCode:1}).angularOffset)).toBeLessThan(Math.abs(severe.angularOffset));
});
test('actor class exemption bypasses both accuracy and flag reductions',()=>{
 const q={...base,actorClass:0x20};
 expect(originalLaunchDrift({...q,skillMask:2,actorFlags:0x4000001})).toEqual(originalLaunchDrift(q));
});
