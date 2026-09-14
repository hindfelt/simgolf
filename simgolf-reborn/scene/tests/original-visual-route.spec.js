import {test,expect} from '@playwright/test';
import {originalVisualRoute} from '../src/simulation/original-visual-route.js';
import {originalVisualStep} from '../src/simulation/original-visual-step.js';
function fixture(){const b=new Uint8Array(76),v=new DataView(b.buffer);v.setInt32(0,10000,true);v.setInt32(4,10000,true);b[0x12]=1;return {visualRecords:[b],worldFlags:0,seed:1234,actorId:77,origin:{x:1,z:2},destination:{x:3,z:4},actors:[new Uint8Array(256),new Uint8Array(256)],terrain:new Uint8Array(2500),tileFlags:new Uint16Array(2500),traversalCosts:new Int8Array(2500),metadataClass:new Uint8Array(128),metadata:[{walkingCost:3}]};}
const locals={x:10100,z:10000,dx:100,dz:0};
test('actual route search feeds the visual stride without replacing caller arguments',()=>{
 const s=fixture(),before=structuredClone(s),out=originalVisualRoute(s,0,locals);
 expect(out.next).toBe('0x403634');expect(out.state.actorId).toBe(77);expect(out.state.origin).toEqual(s.origin);expect(out.state.destination).toEqual(s.destination);expect(out.state.worldFlags&256).toBe(0);
 expect(out.state.visualRecords[0][0x16]).toBe(2);
 const stepped=originalVisualStep(out.state,0);expect(new DataView(stepped.state.visualRecords[0].buffer).getInt32(0,true)).toBe(10032);expect(s).toEqual(before);
});
test('failed route preserves callback changes and pauses without a stride',()=>{
 const out=originalVisualRoute(fixture(),0,locals,(event,state)=>{
  expect(state.worldFlags&256).toBe(256);state.worldFlags|=0x4000;return {state,value:255};
 });
 expect(out.next).toBe('skip');expect(out.state.worldFlags).toBe(0x4000);expect(out.randomDraws).toBe(1);expect(out.state.visualRecords[0][0x1a]).toBeGreaterThan(0);
});
test('return-home arrival clears visibility but preserves the native current route step',()=>{
 const s=fixture();s.visualRecords[0][0x12]=16;s.clubhouse={x:9,z:9};s.phaseCounter=100;
 const out=originalVisualRoute(s,0,locals,(event,state)=>{expect(event.args.slice(0,2)).toEqual([9728,9728]);return {state,value:2};});
 expect(out.state.visualRecords[0][0x12]).toBe(0);expect(out.state.visualRecords[0][0x14]).toBe(35);expect(out.state.visualRecords[0][0x15]).toBe(7);expect(out.next).toBe('0x403634');
});
