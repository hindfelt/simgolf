import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteSearchAnchor,originalPreparedRouteSearch} from '../src/simulation/original-route-search-anchor.js';
const fixture=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));
test('route anchors and weighting match original execution',()=>{
 for(const [q,e] of fixture('original-route-search-anchor'))expect(originalRouteSearchAnchor(q)).toEqual(e);
});
test('complete preparation matches original state and range query',()=>{
 for(const [q,e,expectedCalls] of fixture('original-prepared-route-search')){
  const before=JSON.stringify(q),calls=[];
  expect(originalPreparedRouteSearch(q,c=>{calls.push(c);return q.followingRange;})).toEqual(e);
  expect(calls).toEqual(expectedCalls);expect(JSON.stringify(q)).toBe(before);
 }
});
test('shot counter wraps only for the temporary range query',()=>{
 const q={...fixture('original-prepared-route-search')[0][0],shotCounter:255},calls=[];
 const result=originalPreparedRouteSearch(q,c=>{calls.push(c);return q.followingRange;});
 expect(calls[0].shotCounter).toBe(0);expect(result.shotCounter).toBe(255);
});
