import {test,expect} from '@playwright/test';
import {originalShotPreparation} from '../src/simulation/original-shot-preparation.js';
function fresh(){const b=new Uint8Array(256),a=new DataView(b.buffer);b[0x29]=1;b[0x26]=9;a.setInt16(0xaa,1,true);a.setInt32(0xdc,30000,true);a.setInt32(0xe0,36000,true);a.setInt32(0x10,-1,true);a.setInt32(8,20000,true);a.setInt32(12,25000,true);
 return {actorId:0,actors:[b,new Uint8Array(256)],ballTerrain:1,ballTile:{x:20,z:25},holeTargets:[null,{x:25,z:35}],shotStatCounts:new Uint32Array(32),holeStrokeTotals:new Uint16Array(20),tileFlags:new Uint16Array(2500),updateScratch:0,globalFlags:0};}
test('automatic putt uses pre-planner terrain and cell but refreshed actor and marks',()=>{
 const q=fresh(),before=structuredClone(q);q.shotStatCounts[0]=0xffffffff;
 const r=originalShotPreparation(q,(e,state)=>{
  expect(e.args).toEqual([0,0,-1,0,0]);state.ballTerrain=2;state.ballTile={x:0,z:0};state.tileFlags[1025]=0x80;
  const a=new DataView(state.actors[0].buffer);a.setUint32(0xe8,0x40000000,true);a.setInt32(0xdc,31000,true);state.actors[0][0x25]=14;return {state};
 });
 expect(r.state.shotStatCounts[0]).toBe(0);expect(r.state.holeStrokeTotals[1]).toBe(1);expect(r.state.actors[0][0x22]).toBe(2);expect(r.state.actors[0][0x25]).toBe(14);expect(r.state.actors[0][0x26]).toBe(9);expect(new DataView(r.state.actors[0].buffer).getInt32(0xcc,true)).toBe(31000);
 expect(q.actors).toEqual(before.actors);expect(q.ballTerrain).toBe(1);
});
test('unmarked putt gets original delay while occupied planner budget skips untouched',()=>{
 const q=fresh(),r=originalShotPreparation(q,(_,state)=>({state}));expect(new DataView(r.state.actors[0].buffer).getInt16(0xa6,true)).toBe(-25);expect(r.state.actors[0][0x26]).toBe(0);
 q.updateScratch=1;expect(originalShotPreparation(q)).toEqual({state:q,calls:[],next:'skip'});
});
test('manual aiming initializes once and waits for target selection',()=>{
 const q=fresh();q.ballTerrain=2;new DataView(q.actors[0].buffer).setUint32(0x18,0x200,true);
 const r=originalShotPreparation(q);expect(r.state).toMatchObject({aimX:19,aimZ:24,aimMode:10,aimScratch:0,selectionMode:3,selectedActor:0,aimResult:0});expect(r.calls).toEqual([]);
 new DataView(r.state.actors[0].buffer).setInt32(0xd4,30,true);
 const next=originalShotPreparation(r.state,(e,state)=>{expect(e.args).toEqual([0,1,-1,0,0]);return {state};});expect(next.calls).toHaveLength(1);
});
test('first-hole tutorial stops explicitly and can resume after its effects',()=>{
 const q=fresh();q.ballTerrain=2;q.actors[1][0x20]=32;new DataView(q.actors[0].buffer).setUint32(0x18,0x200,true);
 const r=originalShotPreparation(q);expect(r.next).toBe('0x42b647');expect(r.state.selectionMode).toBeUndefined();
 const resumed=originalShotPreparation(r.state,undefined,'0x42b6f8');expect(resumed.state.selectionMode).toBe(3);expect(resumed.next).toBe('skip');
});

test('packed putt counters retain post-planner changes and wrap in their native widths',()=>{
 const q=fresh();q.statRecords=Array.from({length:32},()=>new Uint8Array(184));q.holes=Array.from({length:20},()=>new Uint8Array(520));q.holeRecords=structuredClone(q.holes);
 q.shotStatCounts[0]=400;q.holeStrokeTotals[1]=500;
 const before=structuredClone(q),r=originalShotPreparation(q,(_,state)=>{
  new DataView(state.statRecords[0].buffer).setUint32(12,0xffffffff,true);
  new DataView(state.holes[1].buffer).setUint16(0x162,0xffff,true);
  state.statRecords[0][20]=37;return {state};
 });
 expect(new DataView(r.state.statRecords[0].buffer).getUint32(12,true)).toBe(0);
 expect(new DataView(r.state.holes[1].buffer).getUint16(0x162,true)).toBe(0);
 expect(r.state.shotStatCounts[0]).toBe(0);expect(r.state.holeStrokeTotals[1]).toBe(0);
 expect(r.state.statRecords[0][20]).toBe(37);expect(r.state.holeRecords).toBe(r.state.holes);expect(q).toEqual(before);
});
test('packed records support preparation without separate counter arrays',()=>{
 const q=fresh();delete q.shotStatCounts;delete q.holeStrokeTotals;
 q.statRecords=Array.from({length:32},()=>new Uint8Array(184));q.holes=Array.from({length:20},()=>new Uint8Array(520));
 const r=originalShotPreparation(q,(_,state)=>({state}));
 expect(new DataView(r.state.statRecords[0].buffer).getUint32(12,true)).toBe(1);
 expect(new DataView(r.state.holes[1].buffer).getUint16(0x162,true)).toBe(1);
});
