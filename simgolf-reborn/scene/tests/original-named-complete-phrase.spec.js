import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCompletePhrase,originalDescribedCompletePhrase} from '../src/simulation/original-complete-phrase.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-named-complete-phrase.json',import.meta.url)));
for(const [q,out] of rows){
 for(const key of ['profileHistory','holeRecords','profileRecords'])if(q[key])for(const id in q[key])q[key][id]=Uint8Array.from(q[key][id]);
 for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);
}
test('full phrase flow with actual actor naming matches the original executable',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);const result=originalCompletePhrase(q,(e,s)=>{
  if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
  return {...s,remarkStyle:12345,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[2]};
 },()=>q.resourceLines);expect(result).toEqual(expected);expect(q).toEqual(before);}
 const standard=new Set(rows.filter(([q])=>q.requestCodes[0]===254).map(([q])=>q.kind));for(let kind=1;kind<=65;kind++)expect(standard.has(kind)).toBe(true);
});
test('complete phrase resolves actual personal names and landmark data',()=>{
 const actors={0:new Uint8Array(256),1:new Uint8Array(256)};actors[1][0xb6]=1;
 const q={actorId:0,kind:20,value:1070,combined:11,requestCodes:[20,-1],profilePhrases:[['MYNAME and PARTNER by DATA']],state:{actors,sourceText:'',remarkStyle:42}};
 const result=originalDescribedCompletePhrase(q,{profileNames:['Gary','Bob']},()=>({objects:{3:{type:4,value:7}},map:{tileAt:()=>22,detailAt:()=>3}}));
 expect(result.state.sourceText).toBe('Gary and Bob by lighthouse');expect(result.state.remarkStyle).toBe(42);expect(result.locationEvents).toEqual([{address:0x407270,args:[7,0]}]);
});
