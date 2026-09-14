import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalApproachShot} from '../src/simulation/original-approach-shot.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const base={skillMask:4,curve:0,terrainCode:2,shotClass:0,club:4,strength:100,explicitTarget:false,mode:0,targetTerrainCode:1,
 speed:3000,verticalSpeed:800,angularOffset:1200,actorFlags:0,modifier:-3,backspinValue:3};
test('original approach gate and response match complete executable fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-approach-shot.json',import.meta.url),'utf8'));
 let cache=originalStrengthCache(),selected=0;
 for(const [q,e] of rows){const result=originalApproachShot(q,cache);expect(result).toEqual(e);cache=JSON.parse(JSON.stringify(result.cache));selected+=Number(result.shotType===3);}
 expect(selected).toBeGreaterThan(0);
});
test('approach increases lift, marks backspin and scales curvature',()=>{
 const result=originalApproachShot(base,originalStrengthCache());
 expect(result.verticalSpeed).toBe(1100);expect(result.actorFlags).toBe(128);expect(result.angularOffset).toBe(1200);
 expect(result.modifier).toBe(0);expect(result.shotType).toBe(3);expect(result.cache.next).toBe(1);
});
test('each bypass preserves original incoming motion and cache',()=>{
 for(const change of [{skillMask:0},{curve:1},{terrainCode:1},{shotClass:-1},{club:3},{strength:25},{targetTerrainCode:2},{explicitTarget:true,mode:2}]){
  const q={...base,...change},cache=originalStrengthCache(),result=originalApproachShot(q,cache);
  expect(result.shotType).toBe(0);expect(result.cache).toBe(cache);expect(result.speed).toBe(q.speed);expect(result.verticalSpeed).toBe(q.verticalSpeed);
 }
});
test('explicit mode three selects approach without a green target',()=>{
 expect(originalApproachShot({...base,explicitTarget:true,mode:3,targetTerrainCode:2},originalStrengthCache()).shotType).toBe(3);
});
