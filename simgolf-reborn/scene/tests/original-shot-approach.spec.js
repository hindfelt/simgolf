import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalShotApproach} from '../src/simulation/original-shot-approach.js';
const base={distance:50,facing:0,target:{x:25,z:25},terrainCode:0,currentShotClass:0};
test('direct approaches match independently executed original instructions',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-shot-approach.json',import.meta.url),'utf8'));
 for(const [q,expected] of rows){
  const cells=new Map(['25,24','26,25','25,26','24,25'].map((key,i)=>[key,q.classes[i]]));
  expect(originalShotApproach({...q,shotClassAt:p=>cells.get(`${p.x},${p.z}`)})).toEqual(expected);
 }
});
test('green and very short shots skip neighboring terrain queries',()=>{
 const shotClassAt=()=>{throw Error('Should not inspect neighbors');};
 expect(originalShotApproach({...base,terrainCode:1,shotClassAt})).toEqual({distance:50,landing:{x:26112,z:26112}});
 expect(originalShotApproach({...base,distance:25,shotClassAt}).distance).toBe(25);
});
test('near-side hazards increase range while far-side hazards reduce it',()=>{
 const near=p=>p.z>25?2:0;
 expect(originalShotApproach({...base,shotClassAt:near}).distance).toBe(56);
 expect(originalShotApproach({...base,currentShotClass:1,shotClassAt:near}).distance).toBe(62);
 expect(originalShotApproach({...base,shotClassAt:p=>p.z<25?2:0}).distance).toBe(44);
 expect(originalShotApproach({...base,shotClassAt:p=>p.z>25?1:0}).distance).toBe(50);
});
test('distance increase caps at twelve and target remains at the tile centre',()=>{
 const q={...base,distance:300,shotClassAt:p=>p.z>25?3:0};
 expect(originalShotApproach(q)).toEqual({distance:312,landing:{x:26112,z:26112}});
 expect(q.target).toEqual({x:25,z:25});
});
