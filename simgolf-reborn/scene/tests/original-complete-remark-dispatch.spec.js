import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCompleteRemarkDispatch,originalDescribedCompleteRemarkDispatch} from '../src/simulation/original-remark-dispatch.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-complete-remark-dispatch.json',import.meta.url)));
for(const [q,out] of rows){
 for(const key of ['profileHistory','holeRecords','profileRecords'])if(q[key])for(const id in q[key])q[key][id]=Uint8Array.from(q[key][id]);
 for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);
}
test('complete dispatch, phrase and display match continuous native execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);const result=originalCompleteRemarkDispatch(q,(e,s)=>{
  if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
  return {...s,remarkStyle:12345,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[2]};
 },()=>q.resourceLines);expect(result).toEqual(expected);expect(q).toEqual(before);}
 const standard=new Set(rows.filter(([q])=>q.requestCodes[0]===254).map(([q])=>q.kind));for(let kind=1;kind<=65;kind++)expect(standard.has(kind)).toBe(true);
});

test('complete dispatch displays named remarks and assigns redirected pending messages',()=>{
 const actors={0:new Uint8Array(256),1:new Uint8Array(256)};actors[0][0xa2]=1;actors[0][0x21]=2;actors[1][0xb6]=1;
 const q={actorId:0,kind:42,value:-1,requestCodes:[-2,-1],profilePhrases:[],state:{actors,sourceText:'',displayText:'Previous',priority:0,requestValues:Array(66).fill(0)}};
 const names={profileNames:['Gary','Bob']};
 const result=originalDescribedCompleteRemarkDispatch(q,names,()=>{throw Error('No location is needed');});
 expect(result.receiver).toBe(1);expect(result.state.displayText).toBe(`Gary (2): ${result.state.sourceText}`);
 expect([...result.state.actors[1].slice(0x84,0x87)]).toEqual([7,170,22]);expect(result.state.requestValues[42]).toBe(-1);
 q.state.priority=1;const suppressed=originalDescribedCompleteRemarkDispatch(q,names);
 expect(suppressed.state.displayText).toBe('Previous');expect(suppressed.receiver).toBe(1);expect(suppressed.displayEvents).toEqual([]);
});
