import {test,expect} from '@playwright/test';
import {originalGroundPhase} from '../src/simulation/original-ground-phase.js';
import {originalMotionCupHandoff} from '../src/simulation/original-motion-cup-handoff.js';
function fixture(){const b=new Uint8Array(256),p=new Uint8Array(256);b[0x20]=32;b[0x29]=1;b[0x2a]=3;b[0xac]=7;b[0xaa]=1;b[0x8c]=1;p[0x29]=1;new DataView(b.buffer).setUint32(0x18,0x40000,true);const period=new Uint8Array(20);period[0]=1;return {actorId:0,actors:[b,p],visualSlot:-1,globalFlags:0,settlementMode:0,settlementBonus:0,periodIndex:0,cashTotal:100,phaseCounter:1,financialPeriods:[period],completionRecords:[new Uint8Array(44)],completionNotices:Array.from({length:64},()=>new Uint8Array(76)),holeRecords:Array.from({length:21},()=>{const b=new Uint8Array(520);b[0]=4;return b;}),difficulty:1,adjustmentSetting:0,seed:1};}
test('ground capture hands pre-snap position and RNG to real scoring once',()=>{
 const before={x:20992,z:20992,height:0,verticalSpeed:0,speed:600,heading:0x10000000,angularOffset:0};
 const motion=originalGroundPhase({before,ball:{...before,x:21002},originTerrainCode:1,club:13,eventFlag:false,centreFlag:0,phaseCounter:1,seed:17},{cellAt:()=>({code:17,rollCoefficient:3,flags:128,edgeFlags:0}),slopeAt:()=>0});
 let sounds=0;const r=originalMotionCupHandoff(fixture(),motion,(e,state)=>{if(e.address===0x40c1f0){sounds++;expect(e.args.slice(0,3)).toEqual([4,21002,20992]);expect(state.seed).toBe(motion.rngState);expect(new DataView(state.actors[0].buffer).getUint32(0x18,true)&0x40000).toBe(0x40000);}return {state};});
 expect(sounds).toBe(1);expect(r.state.cashTotal).toBe(107);expect(r.state.completionRecords[0][23]).toBe(4);expect(r.next).toBe('skip');expect(new DataView(r.state.actors[0].buffer).getInt32(0xec,true)).toBe(0);
});
test('ordinary stops cannot enter cup accounting and missing pre-snap state is rejected',()=>{
 expect(()=>originalMotionCupHandoff(fixture(),{captured:false})).toThrow('captured motion');expect(()=>originalMotionCupHandoff(fixture(),{captured:true,ball:{x:20992,z:20992,speed:0}})).toThrow('captured motion');
});
