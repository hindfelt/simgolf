import {test,expect} from '@playwright/test';
import {originalGroundContact,originalGroundReflection} from '../src/simulation/original-ground-contact.js';
test('matching neighboring strips slow a ball beyond the central square',()=>{
 const q={speed:319,terrainCode:10,boundaryFlags:0,subX:8,subZ:1,cellX:20,cellZ:20,centreFlag:0};
 expect(originalGroundContact(q,()=>1)).toEqual({speed:319,centreFlag:0});
 expect(originalGroundContact(q,(x,z)=>x===20&&z===19?10:1)).toEqual({speed:159,centreFlag:1});
 expect(originalGroundContact({...q,terrainCode:17},()=>1).speed).toBe(159);
 expect(originalGroundContact({...q,terrainCode:17,boundaryFlags:8},()=>1).speed).toBe(319);
});
test('reflection preserves z projection sign and applies both crossed axes in order',()=>{
 const q={x:21*1024,z:19*1024,cellX:20,cellZ:20,heading:0x12345678,edgeFlags:5,stepX:64,stepCosine:64};
 expect(originalGroundReflection(q)).toEqual({heading:0x92345678,reflectedX:true,reflectedZ:true});
 expect(originalGroundReflection({...q,edgeFlags:80})).toEqual({heading:q.heading,reflectedX:false,reflectedZ:false});
 expect(originalGroundReflection({...q,x:20992,z:20992})).toEqual({heading:q.heading,reflectedX:false,reflectedZ:false});
});
