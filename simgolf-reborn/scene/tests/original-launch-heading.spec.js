import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchHeading} from '../src/simulation/original-launch-heading.js';
const base={heading:0,angularOffset:1000,modifier:-3,actorFlags:0,globalFlags:0,distance:100,speed:10000,activeActor:false,curve:0,mode:0,actorClass:0,seed:2002};
test('long-shot heading and curvature match original fixtures including miss outcomes',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-heading.json',import.meta.url),'utf8'));
 let misses=0;
 for(const [q,e] of rows){const {draws,miss,...a}=originalLaunchHeading(q);expect(a).toEqual(e);misses+=Number(miss);}
 expect(misses).toBeGreaterThan(0);
});
test('long-shot miss reduces curvature or clears it for active actor',()=>{
 const result=originalLaunchHeading(base);
 expect(result.miss).toBe(true);expect(result.actorFlags&0x400000).toBeTruthy();expect(result.modifier).toBe(1);
 expect(result.heading).toBe(1500);expect(result.angularOffset).toBe(250);
 const active=originalLaunchHeading({...base,activeActor:true});expect(active.angularOffset).toBe(0);expect(active.heading).toBe(0);
});
test('seventy-five-yard threshold and disable flag skip miss RNG',()=>{
 for(const change of [{distance:75},{globalFlags:0x800000}]){
  const result=originalLaunchHeading({...base,...change});expect(result.draws).toBe(0);expect(result.seed).toBe(base.seed);expect(result.miss).toBe(false);
 }
});
test('shot shape changes reference heading separately from actual heading',()=>{
 const plain=originalLaunchHeading({...base,globalFlags:0x800000});
 const curved=originalLaunchHeading({...base,globalFlags:0x800000,curve:1});
 expect(curved.heading).toBe(plain.heading);expect(curved.referenceHeading).toBe(0x15555554);
});
