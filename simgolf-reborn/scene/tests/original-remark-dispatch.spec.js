import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkDispatch} from '../src/simulation/original-remark-dispatch.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-dispatch.json',import.meta.url)));
test('dispatch targets, helper order and packed writes match native execution for all request kinds',()=>{
 for(const [input,expected] of rows){const q=structuredClone(input);q.state.actors=q.state.actors.map(a=>Uint8Array.from(a));const before=structuredClone(q);
  const got=originalRemarkDispatch(q,(event,state)=>{if(q.mutate){state.actors[q.actorId][0x21]=event.address===0x469330?250:7;state.actors[q.actorId][0x22]=event.address===0x469330?128:3;state.redirected=event.address===0x406b20;}return state;});
  expect({...got,state:{...got.state,actors:got.state.actors.map(a=>[...a])}}).toEqual(expected);expect(q).toEqual(before);
 }
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(65);
});
const input=()=>({actorId:0,kind:35,value:0x12345678,state:{actors:[new Uint8Array(256),new Uint8Array(256)],redirected:false,requestValues:Array(65).fill(0)}});
test('receiver and current actor fields are reloaded after record-processing effects',()=>{
 const q=input();q.state.actors[0][0x21]=255;q.state.actors[0][0x22]=254;
 const got=originalRemarkDispatch(q,(event,state)=>{if(event.address===0x406b20){state.redirected=true;new DataView(state.actors[0].buffer).setInt16(0xa2,1,true);state.actors[0][0x21]=2;state.actors[0][0x22]=3;}return state;});
 expect(got.events[0].args).toEqual([35,0x12345678,-13,0]);expect(got.receiver).toBe(1);expect([...got.state.actors[1].slice(0x84,0x87)]).toEqual([7,163,25]);expect(new DataView(got.state.actors[1].buffer).getUint16(0x9c,true)).toBe(0x5678);expect(got.state.requestValues[35]).toBe(0x12345678);expect(q.state.redirected).toBe(false);
});
test('unimplemented or asynchronous dispatch effects cannot be silently omitted',()=>{
 expect(()=>originalRemarkDispatch(input())).toThrow('explicit record-processing effects');expect(()=>originalRemarkDispatch(input(),async(_event,state)=>state)).toThrow('synchronous speculative');
});
