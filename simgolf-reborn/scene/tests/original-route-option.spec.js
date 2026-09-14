import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteOption} from '../src/simulation/original-route-option.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-option.json',import.meta.url),'utf8'));
test('route-option eligibility and sentinel writes match original executable',()=>{for(const [q,e] of rows)expect(originalRouteOption(q)).toEqual(e);});
test('curved shots require their skill mask and more than 75 yards',()=>{
 for(const [curve,curveMask] of [[-1,1],[1,2]]){
  expect(originalRouteOption({score:0,curve,curveMask,distance:75})).toEqual({eligible:false,score:100000});
  expect(originalRouteOption({score:0,curve,curveMask,distance:76}).eligible).toBe(true);
  expect(originalRouteOption({score:0,curve,curveMask:0,distance:100}).eligible).toBe(false);
 }
 expect(originalRouteOption({score:0,curve:0,curveMask:0,distance:1}).eligible).toBe(true);
});
test('previously excluded scores remain unchanged',()=>{
 for(const score of [99999,100000])expect(originalRouteOption({score,curve:-1,curveMask:0,distance:10})).toEqual({eligible:false,score});
});
