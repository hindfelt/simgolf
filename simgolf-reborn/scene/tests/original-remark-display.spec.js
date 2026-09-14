import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkDisplay} from '../src/simulation/original-remark-display.js';
import {originalDisplayedRemarkDispatch} from '../src/simulation/original-remark-dispatch.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-display.json',import.meta.url)));
test('display priority, actor prefix and restored text match original executable',()=>{
 for(const [input,expected] of rows){const q=structuredClone(input);q.state.actors=q.state.actors.map(a=>Uint8Array.from(a));const before=structuredClone(q);const got=originalRemarkDisplay(q,(_event,state)=>{state.sourceText=q.name;if(q.mutate){state.actors[q.actorId][0x21]=254;state.priority=241;}return state;});expect({...got,state:{...got.state,actors:got.state.actors.map(a=>[...a])}}).toEqual(expected);expect(q).toEqual(before);}
});
const state=()=>({actors:[new Uint8Array(256)],requestValues:Array(65).fill(0),redirected:false,priority:0,sourceText:'Before',displayText:'Old'});
test('integrated dispatch displays the processed phrase and retains packed receiver writes',()=>{
 const q={actorId:0,kind:3,value:17,state:state()},order=[];q.state.actors[0][0x21]=2;
 const got=originalDisplayedRemarkDispatch(q,(event,s)=>{order.push(event.address);s.sourceText='Nice fairway.';return s;},(event,s)=>{order.push(event.address);expect(s.sourceText).toBe('');s.sourceText='Gary';return s;});
 expect(order).toEqual([0x469330,0x466fb0]);expect(got.state.sourceText).toBe('Nice fairway.');expect(got.state.displayText).toBe('Gary (2): Nice fairway.');expect(got.state.actors[0][0x84]).toBe(7);expect(got.state.requestValues[3]).toBe(17);expect(got.displayEvents).toEqual([{address:0x466fb0,args:[0,0]}]);expect(q.state.sourceText).toBe('Before');
});
test('a higher priority existing message suppresses replacement without suppressing record dispatch',()=>{
 const q={actorId:0,kind:3,value:17,state:state()};q.state.priority=1;
 const got=originalDisplayedRemarkDispatch(q,(_event,s)=>({...s,sourceText:'New phrase'}),()=>{throw Error('Name should not be expanded');});
 expect(got.state.displayText).toBe('Old');expect(got.state.sourceText).toBe('New phrase');expect(got.state.requestValues[3]).toBe(17);expect(got.displayEvents).toEqual([]);
});
