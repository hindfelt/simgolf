import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalElevationDistance} from '../src/simulation/original-elevation-distance.js';
import {originalShotClub} from '../src/simulation/original-shot-club.js';
const base={distance:100,skillMask:4,origin:{x:20,z:21},target:{x:10,z:11}};
test('elevation correction and read order match original executable fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-elevation-distance.json',import.meta.url),'utf8'));
 for(const [q,e,expectedReads] of rows){const reads=[];expect(originalElevationDistance(q,(r,c)=>{reads.push([r,c]);return r===10?q.targetHeight:q.originHeight;})).toBe(e);expect(reads).toEqual(expectedReads);}
});
test('uphill and downhill corrections use different original divisors',()=>{
 expect(originalElevationDistance(base,r=>r===10?7:3)).toBe(112);
 expect(originalElevationDistance(base,r=>r===10?3:7)).toBe(90);
});
test('skill bypass avoids consulting height data',()=>{
 expect(originalElevationDistance({distance:100,skillMask:3},()=>{throw Error('Unexpected height read');})).toBe(100);
});
test('elevation-adjusted distance changes original club selection before range clamping',()=>{
 const settings={range:150,terrainCode:2,explicitTarget:false,mode:0,actorFlags:0};
 const up=originalShotClub({...settings,distance:originalElevationDistance(base,r=>r===10?7:3)});
 const down=originalShotClub({...settings,distance:originalElevationDistance(base,r=>r===10?3:7)});
 expect(up).toEqual({strength:112,club:5});expect(down).toEqual({strength:90,club:8});
});
