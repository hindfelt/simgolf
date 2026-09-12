import {test,expect} from '@playwright/test';
import {originalGroundResolution} from '../src/simulation/original-ground-resolution.js';
function fixture(){const b=new Uint8Array(256),partner=new Uint8Array(256);b[0x20]=32;b[0x29]=1;b[0x2a]=3;b[0xac]=7;b[0xaa]=1;b[0x8c]=1;partner[0x29]=1;new DataView(b.buffer).setUint32(0x18,0x40000,true);new DataView(b.buffer).setInt32(0xec,100,true);const p=new Uint8Array(20);p[0]=1;return {actorId:0,actors:[b,partner],ballTile:{x:20,z:15},visualSlot:2,globalFlags:0,settlementMode:0,settlementBonus:0,periodIndex:0,cashTotal:100,phaseCounter:100,financialPeriods:[p],completionRecords:[new Uint8Array(44)],completionNotices:Array.from({length:64},()=>new Uint8Array(76)),holeRecords:Array.from({length:21},()=>{const b=new Uint8Array(520);b[0]=4;return b;}),difficulty:1,adjustmentSetting:0};}
test('rolling into cup pays once and bypasses ordinary landing accounting',()=>{
 const s=fixture(),a=new DataView(s.actors[0].buffer);a.setInt32(0xdc,20992,true);a.setInt32(0xe0,15872,true);s.actors[0][0x24]=13;
 Object.assign(s,{terrain:new Uint8Array(2500).fill(1),tileFlags:new Uint16Array(2500),rollCoefficient:0,boundaryFlags:0,direction:0,subX:8,subZ:8,centreFlag:0,ballTerrain:1,worldFlags:0,seed:1});s.tileFlags[1015]=128;
 const r=originalGroundResolution(s,(_,state)=>({state,value:0}));
 expect(r.captured).toBe(true);expect(r.next).toBe('skip');expect(r.state.cashTotal).toBe(107);expect(r.state.completionRecords[0][23]).toBe(4);expect(r.state.actors[0][0x29]).toBe(2);
 expect(r.calls.map(e=>e.address)).toEqual([0x40c140,0x40c140,0x40c1f0,0x4093b0,0x426b00,0x40c580]);
});
