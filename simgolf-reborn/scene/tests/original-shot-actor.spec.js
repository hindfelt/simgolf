import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalShotActor} from '../src/simulation/original-shot-actor.js';
import {originalSelectedLaunch} from '../src/simulation/original-selected-launch.js';
import {originalStrengthCache} from '../src/simulation/original-strength-search.js';
const fields=[[0x20,'actorClass'],[0x21,'skillMask'],[0x3e,'attitude'],[0x2a,'shotCounter'],[0xfa,'driverValue'],[0xfb,'ironValue'],[0xfc,'abilityValue'],[0xfd,'drawValue'],[0xfe,'fadeValue'],[0xff,'backspinValue'],[0x100,'recoveryValue']];
function encode(q){
 const raw=new Uint8Array(256),v=new DataView(raw.buffer);
 for(const [offset,key] of fields)v.setUint8(offset-8,q[key]);
 v.setUint32(0x18-8,q.actorFlags,true);v.setUint16(0x1e-8,q.abilityFlags,true);return raw;
}
test('decoded original actor fields preserve complete executable launch fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-selected-launch.json',import.meta.url),'utf8'));
 let cache=originalStrengthCache();
 for(const [q,e] of rows){
  const actor=originalShotActor(encode(q),{candidateSkillMask:q.skillMask});
  const input={...q,...actor.launchFields};
  const actual=originalSelectedLaunch(input,cache,{kindAt:p=>(p.x+p.z)%2?0:13,shotClassAt:lie=>q.classes[lie+1]});
  expect(actual).toEqual(e);cache=actual.cache;
 }
});
test('physical skills stay distinct and full ability word/luck byte survive decoding',()=>{
 const raw=new Uint8Array(256);raw[0x20-8]=32;raw[0x21-8]=7;raw[0x101-8]=200;
 new DataView(raw.buffer).setUint16(0x1e-8,0x210,true);
 const actor=originalShotActor(raw,{candidateSkillMask:3});
 expect(actor.launchFields.skillMask).toBe(7);
 expect(actor.physicalFields).toEqual({professional:true,abilityFlags:0x210,luck:200,skillMask:3});
});
test('signed attitude and ball coordinates decode correctly from a subarray without mutation',()=>{
 const backing=new Uint8Array(300),raw=backing.subarray(20,276),v=new DataView(raw.buffer,raw.byteOffset,256);
 v.setInt8(0x3e-8,-4);v.setInt32(0xdc-8,-100,true);v.setUint32(0xe8-8,0xf0000000,true);v.setInt32(0xf4-8,-20,true);
 const before=Array.from(backing),actor=originalShotActor(raw,{candidateSkillMask:0});
 expect(actor.launchFields.attitude).toBe(-4);expect(actor.position.x).toBe(-100);expect(actor.ball.heading).toBe(0xf0000000);expect(actor.ball.angularOffset).toBe(-20);
 expect(Array.from(backing)).toEqual(before);
});
