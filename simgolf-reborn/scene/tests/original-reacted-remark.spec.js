import {test,expect} from '@playwright/test';
import {originalReactedRemark} from '../src/simulation/original-reacted-remark.js';
const input=()=>({actorId:0,kind:20,value:-1,globalFlags:0,requestCodes:[20,-1],profilePhrases:[['Tiring course']],profileRecords:{0:new Uint8Array(560)},state:{actors:[new Uint8Array(256)],sourceText:'',displayText:'',priority:0,requestValues:Array(66).fill(0)}});
const context=()=>({difficulty:1,reactionMode:0,selectedActorId:-1,terrainCode:2,state:{seed:123,holeTotal:0,remarkCount:0,remarkValue:0,tileFlags:0,tileGrowth:0,worldDirty:0,positive:0,negative:0}});
const name=(e,s)=>({...s,sourceText:'Gary'});
test('reaction uses post-history state and returns actor and world changes together',()=>{
 const q=input(),before=structuredClone(q),events=[];
 const result=originalReactedRemark(q,name,undefined,undefined,(s,kind)=>{
  expect(kind).toBe(20);expect(s.actors[0][0x70]).toBe(20);expect(s.actors[0][0x84]).toBe(7);return context();
 },(e,s)=>{events.push(e);return {state:s,result:0};});
 expect(result.next).toBe('continue');expect(Array.isArray(result.state.actors)).toBe(true);
 expect(result.reaction.selectedDelta).toBe(-2);expect(result.reaction.delta).toBe(-1);
 expect(new DataView(result.state.actors[0].buffer).getInt16(0xa4,true)).toBe(-1);
 expect(result.state.actors[0][0x1d]).toBe(14);expect(result.state.actors[0][0x89]&0xc0).toBe(0xc0);
 expect(result.reaction.state.holeTotal).toBe(-1);expect(result.reaction.state.remarkCount).toBe(1);expect(result.reaction.state.negative).toBe(1);expect(result.reaction.randomDraws).toBe(1);
 expect(events[0].args[0]).toBe(87);expect(q).toEqual(before);
});
test('early exits do not read reaction data or emit later effects',()=>{
 const q=input();q.globalFlags=0x2000000;
 const result=originalReactedRemark(q);expect(result.next).toBe('return');expect(result.reaction).toBeNull();expect(result.state).toEqual(q.state);
});
test('reaction profile flags and history come from packed original records',()=>{
 const q=input();q.kind=59;q.requestCodes=[59,-1];q.profileHistory={0:new Uint8Array(44)};q.profileHistory[0][0]=1;
 const result=originalReactedRemark(q,name,undefined,undefined,context,(e,s)=>({state:s,result:0}));
 expect(result.reaction.selectedDelta).toBe(1);expect(result.reaction.state.positive).toBe(1);
 expect(result.state.actors[0][0x89]&0x40).toBe(0x40);
});
test('missing world state cannot silently omit reaction effects',()=>{
 expect(()=>originalReactedRemark(input(),name)).toThrow('world snapshot is unavailable');
});
