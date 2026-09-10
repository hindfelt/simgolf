import {test,expect} from '@playwright/test';
import {originalRouteLandingScore} from '../src/simulation/original-route-landing-score.js';
const base={landing:{x:10752,z:10752},cup:{x:10,z:10},hole:2,skillMask:0,excludedClass:32,distanceDivisor:4};
const run=(t,options={})=>originalRouteLandingScore({...base,...options,terrainAt:()=>({code:2,shotClass:0,flags:0,...t})});
test('same-hole marker rewards landing, other-hole marker penalizes it',()=>{
 expect(run({flags:0x82})).toEqual({score:-8,goodLandings:1,lie:-1,remaining:0});
 expect(run({flags:0x83}).score).toBe(16);
});
test('excluded terrain and exclusion flag override marker reward',()=>{
 expect(run({code:20,flags:0x82}).score).toBe(256);
 expect(run({flags:0x482}).score).toBe(256);
});
test('imagination samples eight nearby points and rewards each marker',()=>{
 expect(run({flags:0x82},{skillMask:4,score:10,goodLandings:3})).toEqual({score:-6,goodLandings:4,lie:-1,remaining:0});
 expect(run({shotClass:2},{skillMask:4}).score).toBe(32);
});
test('remaining route distance uses original units and integer divisor',()=>{
 expect(run({}, {cup:{x:15,z:10},distanceDivisor:6})).toEqual({score:20,goodLandings:1,lie:0,remaining:125});
});
