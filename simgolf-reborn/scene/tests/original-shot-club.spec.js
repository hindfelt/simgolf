import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalShotClub} from '../src/simulation/original-shot-club.js';
const base={distance:150,range:200,terrainCode:2,explicitTarget:false,mode:0,actorFlags:0};
test('club and nominal strength match original executable fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-shot-club.json',import.meta.url),'utf8'));
 for(const [q,expected] of rows)expect(originalShotClub(q)).toEqual(expected);
});
test('strength clamps to range while terrain sets minimum club',()=>{
 expect(originalShotClub({...base,distance:300})).toEqual({strength:200,club:1});
 expect(originalShotClub({...base,distance:300,terrainCode:0})).toEqual({strength:200,club:0});
 expect(originalShotClub({...base,distance:-1})).toEqual({strength:0,club:11});
});
test('explicit-target mode three overrides only clubs below five',()=>{
 expect(originalShotClub({...base,distance:200,mode:3,explicitTarget:true})).toEqual({strength:144,club:5});
 expect(originalShotClub({...base,mode:3,explicitTarget:true})).toEqual({strength:150,club:5});
 expect(originalShotClub({...base,distance:200,mode:3})).toEqual({strength:200,club:1});
});
test('short green shot selects club thirteen strictly below fifty unless actor flag one',()=>{
 expect(originalShotClub({...base,terrainCode:1,distance:49}).club).toBe(13);
 expect(originalShotClub({...base,terrainCode:1,distance:50}).club).toBe(11);
 expect(originalShotClub({...base,terrainCode:1,distance:49,actorFlags:1}).club).toBe(11);
});
