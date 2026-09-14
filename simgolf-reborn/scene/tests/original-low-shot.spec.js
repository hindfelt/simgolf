import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLowShot,originalLowShotGate} from '../src/simulation/original-low-shot.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const base={actorFlags:0,explicitTarget:false,firstWaterIndex:0,skillMask:4,terrainCode:2,mode:0,x:26112,z:26112,referenceHeading:0};
test('low-shot output and all cache entries match original sequential fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-low-shot.json',import.meta.url),'utf8'));
 let cache=originalStrengthCache();
 for(const [q,expected] of rows){const result=originalLowShot(q,cache);expect(result).toEqual(expected);cache=JSON.parse(JSON.stringify(result.cache));}
});
test('eligibility skips map reads for bypass conditions and explicit targets',()=>{
 const fail=()=>{throw Error('Unexpected map read');};
 for(const change of [{skillMask:0},{terrainCode:1},{firstWaterIndex:1},{actorFlags:1}])expect(originalLowShotGate({...base,...change},fail).eligible).toBe(false);
 expect(originalLowShotGate({...base,explicitTarget:true,mode:4},fail).eligible).toBe(true);
 expect(originalLowShotGate({...base,explicitTarget:true,mode:3},fail).eligible).toBe(false);
});
test('obstacle scan uses original short and one-tile projections and stops on first hit',()=>{
 const points=[];
 expect(originalLowShotGate(base,p=>{points.push(p);return p.z===24?13:0;}).eligible).toBe(true);
 expect(points).toEqual([{x:25,z:25},{x:25,z:24}]);
 let calls=0;expect(originalLowShotGate(base,()=>{calls++;return 13;}).eligible).toBe(true);expect(calls).toBe(1);
});
test('override sets low shot type, clears curve and caps vertical launch',()=>{
 const result=originalLowShot({speed:6000,strength:150,firstWaterIndex:0},originalStrengthCache());
 expect(result.verticalSpeed).toBe(256);expect(result.shotType).toBe(4);expect(result.curve).toBe(0);
 expect(result.cache.next).toBe(1);
 const another=originalLowShot({speed:6000,strength:150,firstWaterIndex:3},originalStrengthCache());
 expect(another.cache.next).toBe(2);expect(another.speed).not.toBe(result.speed);
});
