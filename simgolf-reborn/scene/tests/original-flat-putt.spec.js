import {test,expect} from '@playwright/test';
import {originalFlatPuttStart,originalFlatPuttStep} from '../src/simulation/original-flat-putt.js';
import {originalPuttLaunch} from '../src/simulation/original-putt-strength.js';
function step(state,phaseCounter=state.steps){
 return originalFlatPuttStep(state,{phaseCounter,seed:state.ball.seed}).state;
}
function start(yards,angularOffset=0){
 const launch=originalPuttLaunch({distanceYards:yards,seed:1234});
 return originalFlatPuttStart({x:20992,z:20992+Math.trunc(yards*1024/25),height:0,verticalSpeed:0,club:13,heading:0,angularOffset,speed:launch.speed,seed:launch.rngState},{cupX:20,cupZ:20});
}
test('recovered putts preserve exact trajectory after serializing mid-roll',()=>{
 for(const yards of [2,5,10,20]){
  let state=start(yards);const untouched=JSON.stringify(state);let resumed;
  for(let tick=0;tick<200&&state.status==='rolling';tick++){
   state=step(state);
   if(tick===0){expect(untouched).not.toBe(JSON.stringify(state));resumed=JSON.parse(JSON.stringify(state));}
   else{resumed=step(resumed);expect(resumed).toEqual(state);}
  }
  expect(state.status).toBe('captured');expect(state.ball.x).toBe(20992);expect(state.ball.z).toBe(20992);
  expect(step(state)).toEqual(state);
 }
});
test('curvature persists across steps and input state is not mutated',()=>{
 let state=start(20,0x04000000),before=JSON.stringify(state);const next=step(state);
 expect(JSON.stringify(state)).toBe(before);expect(next.ball.heading).not.toBe(state.ball.heading);
 for(let i=0;i<200&&state.status==='rolling';i++)state=step(state);
 expect(['captured','stopped']).toContain(state.status);expect(state.steps).toBeGreaterThan(1);
});
test('unsupported airborne launch cannot silently use the flat-ground integrator',()=>{
 expect(()=>originalFlatPuttStart({height:1,verticalSpeed:0,club:13},{cupX:20,cupZ:20})).toThrow(/grounded/);
});

test('shared phase and RNG are supplied by the world, including wraparound and terminal balls',()=>{
 const initial=start(20,0x04000000);
 const noDraw=originalFlatPuttStep(initial,{phaseCounter:0xffffffff,seed:17});
 expect(noDraw.draws).toBe(0);expect(noDraw.rngState).toBe(17);
 const wrapped=originalFlatPuttStep(noDraw.state,{phaseCounter:0,seed:91});
 expect(wrapped.draws).toBe(1);expect(wrapped.rngState).not.toBe(91);
 // An unrelated world draw replaces this ball's previous RNG snapshot.
 const otherSeed=originalFlatPuttStep(noDraw.state,{phaseCounter:0,seed:92});
 expect(otherSeed.rngState).not.toBe(wrapped.rngState);
 expect(()=>originalFlatPuttStep(initial,{phaseCounter:0x100000000,seed:17})).toThrow(/shared/);
 const terminal={...initial,status:'stopped'};
 expect(originalFlatPuttStep(terminal,{phaseCounter:8,seed:99})).toEqual({state:terminal,rngState:99,draws:0});
});
test('stopping clears residual speed as the original stop branch does',()=>{
 const state=start(20);state.ball.speed=65;
 const result=originalFlatPuttStep(state,{phaseCounter:1,seed:1234});
 expect(result.state.status).toBe('stopped');expect(result.state.ball.speed).toBe(0);
 expect(result.rngState).toBe(1234);
});
