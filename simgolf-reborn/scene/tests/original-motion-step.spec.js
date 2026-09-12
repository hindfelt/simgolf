import {test,expect} from '@playwright/test';
import {originalMotionStep} from '../src/simulation/original-motion-step.js';
const world={cellAt:()=>({code:1,flags:0,edgeFlags:0,rollCoefficient:3,bounceCoefficient:4,scatterCoefficient:0}),heightAt:()=>0,slopeAt:()=>0};
const q={ball:{x:20992,z:20992,height:100,speed:1000,verticalSpeed:0,heading:0,angularOffset:0,seed:17},originTerrainCode:1,
 club:4,eventFlag:false,centreFlag:0,stateFlags:0,skillEnabled:false,skillMask:0,luck:0,targetTile:{x:20,z:20},variant:0,seed:17,phaseCounter:0};
test('one saved motion state continues through flight, landing and rolling to rest',()=>{
 let a=structuredClone(q),b=structuredClone(q),landed=false,airborne=false;
 for(let i=0;i<500;i++){
  const x=originalMotionStep(a,world),y=originalMotionStep(b,world);expect(y).toEqual(x);
  landed||=x.landed;airborne||=x.ball.height>1;
  if(x.stopped){expect(x.ball.speed).toBe(0);expect(landed).toBe(true);expect(airborne).toBe(true);return;}
  a={...a,ball:x.ball,stateFlags:x.stateFlags,centreFlag:x.centreFlag,seed:x.rngState,phaseCounter:(a.phaseCounter+1)>>>0};
  b=JSON.parse(JSON.stringify(a));
 }
 throw Error('Motion did not stop');
});
test('ordinary rolling ticks do not execute landing-only scattering',()=>{
 const a=originalMotionStep({...q,ball:{...q.ball,height:0,verticalSpeed:0},phaseCounter:1},
  {...world,cellAt:()=>({...world.cellAt(),scatterCoefficient:3})});
 expect(a.landed).toBe(false);expect(a.draws).toBe(0);expect(a.sounds).toEqual([]);
});
