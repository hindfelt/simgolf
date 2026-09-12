import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalStandardPhrase} from '../src/simulation/original-standard-phrase.js';
import {originalSelectedPhrase} from '../src/simulation/original-phrase-entry.js';
import {originalDescribedPhrasePostprocess} from '../src/simulation/original-phrase-postprocess.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-standard-phrase.json',import.meta.url)));
for(const [q,out] of rows)for(const state of [q.state,out.state])for(const id in state.actors)state.actors[id]=Uint8Array.from(state.actors[id]);
test('supported original standard remarks and display styles match native dispatch',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalStandardPhrase(q)).toEqual(expected);expect(q).toEqual(before);}
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
