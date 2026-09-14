import {test,expect} from '@playwright/test';
import {originalCandidateBounce} from '../src/simulation/original-candidate-bounce.js';
const base={height:0,verticalSpeed:-768,bounceCoefficient:1,mode:0,boundaryFlags:0,terrainFlags:0,subX:8,subZ:8};
const run=q=>originalCandidateBounce({...base,...q});
test('normal mode applies boundary floor and marked-centre coefficient',()=>{
 expect(run({}).verticalSpeed).toBe(0);
 expect(run({boundaryFlags:1}).coefficient).toBe(2);
 expect(run({boundaryFlags:1,terrainFlags:0x20})).toMatchObject({coefficient:4,verticalSpeed:192,landed:true});
});
test('design and alternate modes retain the original terrain coefficient',()=>{
 for(const mode of [1,2])expect(run({mode,boundaryFlags:1,terrainFlags:0x20})).toMatchObject({coefficient:1,verticalSpeed:0});
});
test('source centre check has asymmetric x and z bounds',()=>{
 for(const [subX,subZ,coefficient] of [[4,8,1],[5,5,4],[10,15,4],[11,8,1],[8,4,1]])
 expect(run({subX,subZ,terrainFlags:0x20}).coefficient).toBe(coefficient);
});
test('non-contact states do not rebound and contact clears height',()=>{
 expect(run({height:1})).toMatchObject({height:1,verticalSpeed:-768,landed:false});
 expect(run({verticalSpeed:0})).toMatchObject({verticalSpeed:0,landed:false});
 expect(run({height:-10,bounceCoefficient:4})).toMatchObject({height:0,verticalSpeed:192,landed:true});
});
