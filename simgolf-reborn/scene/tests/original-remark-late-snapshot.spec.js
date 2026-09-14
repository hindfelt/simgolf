import {test,expect} from '@playwright/test';
import {originalRemarkAdjustment} from '../src/simulation/original-remark-adjustment.js';
import {originalRemarkResponse} from '../src/simulation/original-remark-response.js';
import {originalRemarkWorldSnapshot,originalApplyRemarkWorld} from '../src/simulation/original-remark-world.js';
function setup(){
 const actor=new Uint8Array(256),a=new DataView(actor.buffer);a.setInt32(0,1024,true);a.setInt32(4,3072,true);a.setUint32(0x10,0x20000000,true);actor[0x21]=1;
 const holes={1:new Uint8Array(520),2:new Uint8Array(520)};new DataView(holes[2].buffer).setInt16(0x160,9,true);
 const world={actors:{0:actor},holeRecords:holes,terrain:new Uint8Array(64).fill(2),tileFlags:new Uint16Array(64),tileGrowth:new Uint8Array(64),positive:new Uint8Array(64),negative:new Uint8Array(64),seed:123,worldDirty:0,difficulty:1,reactionMode:2,globalFlags:0,selectedActorId:-1};
 const initial=originalRemarkWorldSnapshot(world,0,20);
 return {world,q:{...initial.context,kind:20,value:0,actorId:0,voiceBase:0,before:actor.slice(),state:{...initial.context.state,profiles:{0:0},profileVoiceBytes:{0:0},holeBytes:{}}}};
}
test('outcome rereads destination hole and tile after speech effects',()=>{
 const {world,q}=setup(),before=structuredClone(world);let snapshot,reads=0;
 const result=originalRemarkAdjustment(q,(event,s)=>{
  expect(event.address).toBe(0x40c1f0);s.actor[0x21]=2;new DataView(s.actor.buffer).setInt32(4,4096,true);s.seed=999;return {state:s,result:0};
 },s=>{
  reads++;expect(s.actor[0x1d]).toBe(14);
  snapshot=originalRemarkWorldSnapshot({...world,seed:s.seed,actors:{0:s.actor}},0,20);return snapshot.context;
 });
 const written=originalApplyRemarkWorld(world,snapshot,result);
 expect(reads).toBe(1);expect(snapshot.tileIndex).toBe(54);expect(result.state.holeTotal).toBe(8);
 expect(written.holeRecords[1]).toEqual(world.holeRecords[1]);expect(written.tileGrowth[53]).toBe(0);expect(written.negative[53]).toBe(0);
 expect(written.tileGrowth[54]).toBe(1);expect(written.negative[54]).toBe(1);expect(written.seed).toBe((Math.imul(999,0x41c64e6d)+0x3039)>>>0);expect(world).toEqual(before);
});
test('early reaction return never reads an outcome snapshot',()=>{
 const {q}=setup();expect(originalRemarkAdjustment({...q,kind:48},undefined,()=>{throw Error('Unexpected read');}).next).toBe('return');
});
test('preamble state restoration precedes the fresh snapshot',()=>{
 const {q}=setup();q.state.actor[0x21]=2;
 const result=originalRemarkResponse({...q,kind:40,delta:0},undefined,s=>{expect(s.actor[0x21]).toBe(1);return {state:{...q.state,actor:q.state.actor}};});
 expect(result.state.actor[0x21]).toBe(1);
});
test('asynchronous outcome reads cannot race a reaction',()=>{
 const {q}=setup();expect(()=>originalRemarkResponse({...q,delta:0},undefined,async()=>({state:q.state}))).toThrow('synchronous');
});
