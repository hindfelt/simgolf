import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPhrasePostprocess,originalNamedPhrasePostprocess} from '../src/simulation/original-phrase-postprocess.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-phrase-postprocess.json',import.meta.url)));
test('ordered native substitutions and description calls match executable fixtures',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalPhrasePostprocess(q,(e,s)=>({...s,sourceText:q.names[e.args[0]]}),(e,s)=>({...s,sourceText:s.sourceText+q.location}))).toEqual(expected);expect(q).toEqual(before);}
});
const input=()=>({actorId:0,kind:4,value:0,state:{sourceText:'MYNAME MYNAME PARTNER DATA DATA'},terms:[{name:'Oak',alternate:'tree',type:13}],labels:[]});
test('only the first marker is replaced and subsequent markers can occur in inserted names',()=>{
 const result=originalPhrasePostprocess(input(),(e,s)=>({...s,sourceText:e.args[0]===0?'PARTNER':'Bob'}));expect(result.state.sourceText).toBe('Bob MYNAME PARTNER tree DATA');
});
test('minus-one data preserves the untouched source without requiring name or terrain data',()=>{
 const q=input();q.value=-1;expect(originalPhrasePostprocess(q)).toEqual({state:q.state,events:[]});
});
test('recovered actor naming supplies both golfers without a name placeholder',()=>{
 const q=input(),a=new Uint8Array(256),b=new Uint8Array(256);new DataView(b.buffer).setInt16(0xb6,1,true);q.state.actors={0:a,1:b};q.state.sourceText='MYNAME and PARTNER like DATA.';
 expect(originalNamedPhrasePostprocess(q,{profileNames:['Gary','Clara'],staffNames:[]}).state.sourceText).toBe('Gary and Clara like tree.');
});
test('location-based remarks require their actual description resolver',()=>{
 const q=input();q.kind=20;expect(()=>originalPhrasePostprocess(q,(_e,s)=>({...s,sourceText:'Gary'}))).toThrow('location description requires');
});
