import {test,expect} from '@playwright/test';
import {originalCandidateStart,originalCandidateStep} from '../src/simulation/original-candidate-step.js';
const launch={x:26112,z:26112,height:0,speed:3000,verticalSpeed:768,heading:0x20000000,angularOffset:10001,flags:0,seed:2002,professional:false,abilityFlags:0,luck:5,skillMask:7};
const terrain={code:2,flags:0,wallFlags:0,rollCoefficient:0,bounceCoefficient:3};
const env={terrainAt:()=>terrain,heightAt:()=>0,slopeAt:()=>0,mode:0,variant:0};
function finish(state,environment=env){
 for(let i=0;i<2000&&state.speed!==0;i++)state=originalCandidateStep(state,environment);
 expect(state.speed).toBe(0);return state;
}
test('candidate launch progresses through flight, landing and roll to a stop',()=>{
 const start=originalCandidateStart(launch);expect(start.angularOffset).toBe(5000);
 const result=finish(start);
 expect(result.steps).toBeGreaterThan(10);expect(result.height).toBe(0);expect(result.verticalSpeed).toBe(0);
 expect(result.x).not.toBe(launch.x);expect(result.z).not.toBe(launch.z);
 expect(launch.angularOffset).toBe(10001);
});
test('serialized midflight candidate resumes identically including RNG and counters',()=>{
 const environment={...env,terrainAt:()=>({...terrain,code:13})};
 const start=originalCandidateStart(launch),expected=finish(start,environment);
 let partial=start;for(let i=0;i<8;i++)partial=originalCandidateStep(partial,environment);
 expect(finish(JSON.parse(JSON.stringify(partial)),environment)).toEqual(expected);
 expect(expected.randomDraws).toBeGreaterThan(0);
});
test('stopped candidate never consults map or consumes random draws',()=>{
 const fail=()=>{throw Error('Unexpected map read');},state={...originalCandidateStart(launch),speed:0};
 expect(originalCandidateStep(state,{...env,terrainAt:fail,heightAt:fail,slopeAt:fail})).toEqual(state);
});
