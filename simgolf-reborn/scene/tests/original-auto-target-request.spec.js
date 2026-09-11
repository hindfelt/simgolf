import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoTargetRequest} from '../src/simulation/original-auto-target-request.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-target-request.json',import.meta.url),'utf8'));
const q={x:26112,z:26112,heading:0,range:200,distance:100,actorFlags:0,skillMask:0,terrainCode:2,explicitTarget:false,plannerArgument:-1};
test('automatic target branches and projection match original executable fixtures',()=>{for(const [input,e] of rows)expect(originalAutoTargetRequest(input)).toEqual(e);});
test('short approach threshold changes with original skill and actor flags',()=>{
 expect(originalAutoTargetRequest({...q,distance:75}).path).toBe('approach');expect(originalAutoTargetRequest({...q,distance:76}).path).toBe('search');
 for(const fields of [{skillMask:4},{actorFlags:1}]){expect(originalAutoTargetRequest({...q,...fields,distance:25}).path).toBe('approach');expect(originalAutoTargetRequest({...q,...fields,distance:26}).path).toBe('search');}
});
test('explicit targets bypass search while green lies enter approach',()=>{
 expect(originalAutoTargetRequest({...q,explicitTarget:true}).path).toBe('assessment');expect(originalAutoTargetRequest({...q,plannerArgument:20000}).path).toBe('assessment');expect(originalAutoTargetRequest({...q,terrainCode:1}).path).toBe('approach');
});
test('search reach reserves 25 yards and cannot pass the original target distance',()=>{
 expect(originalAutoTargetRequest({...q,distance:300}).rangeDistance).toBe(175);
 expect(originalAutoTargetRequest(q).rangeDistance).toBe(100);
 expect(originalAutoTargetRequest({...q,range:20}).rangeDistance).toBe(0);
 expect(originalAutoTargetRequest({...q,heading:0}).target.x).toBe(25);
});
