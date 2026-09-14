import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalEligibleRemarkDispatch} from '../src/simulation/original-remark-dispatch.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-eligible-remark-dispatch.json',import.meta.url)));
for(const [q,out] of rows){
 for(const key of ['profileHistory','holeRecords','profileRecords'])if(q[key])for(const id in q[key])q[key][id]=Uint8Array.from(q[key][id]);
 for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);
}
test('eligibility through complete message dispatch matches continuous native execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);const result=originalEligibleRemarkDispatch(q,(e,s)=>{
  if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
  return {...s,remarkStyle:12345,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[2]};
 },()=>q.resourceLines);expect(result).toEqual(expected);expect(q).toEqual(before);}
 const standard=new Set(rows.filter(([q])=>q.requestCodes[0]===254).map(([q])=>q.kind));for(let kind=1;kind<=65;kind++)expect(standard.has(kind)).toBe(true);
});


test('suppressed remarks need no phrase data and do not touch state',()=>{
 const q={actorId:0,kind:19,value:0,globalFlags:0x2000000,state:{actors:{0:new Uint8Array(256)},sourceText:'Existing'}};
 const before=structuredClone(q);const result=originalEligibleRemarkDispatch(q);
 expect(result.allowed).toBe(false);expect(result.state).toEqual(q.state);expect(result.events).toEqual([]);expect(q).toEqual(before);
});
test('score remapping is retained through phrase dispatch and request storage',()=>{
 const [q,expected]=rows.find(([q,out])=>q.kind===19&&out.allowed&&out.kind===23);
 expect(expected.events[0].args[0]).toBe(23);expect(expected.state.requestValues[23]).toBe(q.value);
 expect(expected.state.actors[expected.receiver][0x85]&127).toBe(23);
});
