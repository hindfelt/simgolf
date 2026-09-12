import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalStandardPhrase,originalDescribedStandardPhrase} from '../src/simulation/original-standard-phrase.js';
import {originalSelectedPhrase} from '../src/simulation/original-phrase-entry.js';
import {originalDescribedPhrasePostprocess} from '../src/simulation/original-phrase-postprocess.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-standard-phrase.json',import.meta.url)));
for(const [q] of rows)if(q.profileRecords)for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);
for(const [q,out] of rows)for(const state of [q.state,out.state])for(const id in state.actors)state.actors[id]=Uint8Array.from(state.actors[id]);
test('supported original standard remarks and display styles match native dispatch',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalStandardPhrase(q,(e,s)=>({...s,remarkStyle:12345,sourceText:s.sourceText.split('\0',1)[0]+(e.address===0x466fb0?'Name'+e.args[0]:'Place'+e.args[2])}))).toEqual(expected);expect(q).toEqual(before);}
});
test('personal phrases take precedence and preserve style while standard fallback resets it',()=>{
 const q={kind:20,actorId:0,combined:11,requestCodes:[20,-1],profilePhrases:[['My DATA']],state:{sourceText:'',remarkStyle:91,redirected:true,actors:{0:new Uint8Array(256)}}};
 expect(originalSelectedPhrase(q)).toMatchObject({hole:1,next:'postprocess',state:{sourceText:'My DATA',remarkStyle:91,redirected:false}});
 q.profilePhrases=[['']];const selected=originalSelectedPhrase(q);expect(selected.state.remarkStyle).toBe(0x80007d08);expect(selected.state.sourceText).toContain('DATA');expect(selected.hole).toBe(1);
});
test('selected standard location phrase expands through the actual landmark description',()=>{
 const q={kind:20,actorId:0,value:1070,combined:11,requestCodes:[-2,-1],profilePhrases:[],state:{sourceText:'',actors:{0:new Uint8Array(256),1:new Uint8Array(256)}}};
 const selected=originalSelectedPhrase(q);
 const result=originalDescribedPhrasePostprocess({...q,state:selected.state},{profileNames:['Gary']},()=>({objects:{3:{type:4,value:7}},map:{tileAt:()=>22,detailAt:()=>3}}));
 expect(result.state.sourceText).toBe(selected.state.sourceText.replace('DATA','lighthouse'));expect(result.state.sourceText).not.toContain('DATA');expect(result.state.remarkStyle).toBe(0x80007d08);
});
test('unrecovered standard cases cannot masquerade as successful generic remarks',()=>{
 expect(()=>originalStandardPhrase({kind:1,state:{sourceText:''}})).toThrow('case 1 is not reconstructed');
});

test('direct standard helpers resolve actual actor names and landmark records',()=>{
 const state={sourceText:'',actors:{0:new Uint8Array(256)}};
 const context=()=>({objects:{3:{type:4,value:7}},map:{tileAt:()=>22,detailAt:()=>3}});
 const name=originalDescribedStandardPhrase({kind:42,actorId:0,state},{profileNames:['Gary']},context);
 expect(name.state.sourceText).toContain('Gary');expect(name.state.redirected).toBe(true);
 const place=originalDescribedStandardPhrase({kind:44,actorId:0,value:22,state},{profileNames:['Gary']},context);
 expect(place.state.sourceText).toContain('lighthouse');expect(place.state.remarkStyle).toBe(0x800023e8);
 expect(state.sourceText).toBe('');expect(state.redirected).toBeUndefined();
});
test('trait-dependent remarks resolve familiar address and partner names',()=>{
 const self=new Uint8Array(256),partner=new Uint8Array(256);partner[0xb6]=1;self[0xa2]=1;
 const state={sourceText:'',actors:{0:self,1:partner}},names={profileNames:['Gary','Mary']};
 self[0xae]=1;
 const familiar=originalDescribedStandardPhrase({kind:26,actorId:0,state},names);
 expect(familiar.state.sourceText).toContain(', honey');expect(familiar.state.redirected).toBe(true);
 self[0xae]=3;
 const addressed=originalDescribedStandardPhrase({kind:26,actorId:0,state},names);
 expect(addressed.state.sourceText).toContain(', Mary');expect(addressed.events).toEqual([{address:0x466fb0,args:[1,1]}]);
 self[0xae]=2;
 const named=originalDescribedStandardPhrase({kind:2,actorId:0,state},names);
 expect(named.state.sourceText).toContain('Gary');expect(named.state.redirected).toBe(true);expect(named.state.remarkStyle).toBe(0x80007d08);
 self[0xae]=4;
 const called=originalDescribedStandardPhrase({kind:4,actorId:0,state},names);
 expect(called.state.sourceText).toContain('Gary');expect(called.state.redirected).toBe(true);expect(state.sourceText).toBe('');
});
test('facility feedback follows original phase and upgrade level without inventing a benefit',()=>{
 const cases=[[51,'drivingRange','distance'],[52,'proShop','accuracy'],[53,'puttingGreen','putting']];
 for(const [kind,key,skill] of cases){
  const base={kind,actorId:0,state:{sourceText:'',remarkStyle:0}};
  expect(originalStandardPhrase({...base,originalClock:0}).state.sourceText).toContain(skill);
  const upgraded=originalStandardPhrase({...base,originalClock:8,facilityLevels:{[key]:3}});expect(upgraded.state.sourceText).toContain('deluxe');
  const absent=originalStandardPhrase({...base,originalClock:8,facilityLevels:{[key]:0}});expect(absent.state.sourceText).toBe('');expect(absent.state.remarkStyle).toBe(0x80006318);
  expect(()=>originalStandardPhrase({...base,originalClock:8})).toThrow('facility level is unavailable');
 }
});
test('profile voice requires original profile metadata and preserves it',()=>{
 const actor=new Uint8Array(256),profile=new Uint8Array(560),q={kind:39,actorId:0,state:{sourceText:'',actors:{0:actor}},profileRecords:{0:profile}};
 const first=originalStandardPhrase(q);expect(first.state.sourceText).toContain('scared');
 profile[0x21]=0x80;const second=originalStandardPhrase(q);expect(second.state.sourceText).toContain('frightened');expect(profile[0x21]).toBe(0x80);
 expect(()=>originalStandardPhrase({...q,profileRecords:{}})).toThrow('profile is unavailable');
});
