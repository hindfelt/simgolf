import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteSpread,originalRoutePrunedState} from '../src/simulation/original-route-spread.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-spread.json',import.meta.url),'utf8'));
const spread={minDistance:65535,maxDistance:-1000,minHeading:0x0fffffff,maxHeading:-536870912};
test('survivor spread matches original executable fixtures',()=>{for(const [q,e] of rows)expect(originalRouteSpread(q)).toEqual(e);});
test('zero stored distance skips all statistics and range reads',()=>{
 expect(originalRouteSpread({storedDistance:0,spread})).toEqual(spread);
});
test('heading spread is measured only beyond 100 yards',()=>{
 const q={spread,storedDistance:20,origin:{x:512,z:512},sampleFlags:100,cupHeading:80};
 expect(originalRouteSpread({...q,target:{x:4,z:0}}).minHeading).toBe(spread.minHeading);
 expect(originalRouteSpread({...q,target:{x:5,z:0}}).minHeading).toBe(20);
});
test('pruned-out options cannot influence survivor statistics',()=>{
 const scores=Array.from({length:441},()=>Array(6).fill(100000)),distances=Array.from({length:441},()=>Array(6).fill(0)),flags=Array.from({length:441},()=>Array(6).fill(0));
 scores[220][1]=0;scores[221][1]=200;distances[220][1]=123;distances[221][1]=999;
 const q={scores,distances,flags,bestScore:0,samples:4,work:0,origin:{x:512,z:512},anchor:{x:25,z:25},cup:{x:30,z:25}};
 const a=originalRoutePrunedState(q);expect(a.survivors).toEqual([{candidate:220,option:1}]);expect(a.spread.minDistance).toBe(123);expect(a.spread.maxDistance).toBe(123);
 expect(scores[221][1]).toBe(200);
 expect(originalRoutePrunedState({...q,samples:2,distances:null,flags:null}).spread).toEqual(spread);
});
