import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPhraseEntry} from '../src/simulation/original-phrase-entry.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-phrase-entry.json',import.meta.url)));
test('personal phrase overrides, narrator clearing and signed hole division match native execution',()=>{
 const paths=new Set();for(const [input,expected] of rows){const q=structuredClone(input);q.state.actors=Object.fromEntries(Object.entries(q.state.actors).map(([k,v])=>[k,Uint8Array.from(v)]));const before=structuredClone(q),got=originalPhraseEntry(q);expect({...got,state:{...got.state,actors:Object.fromEntries(Object.entries(got.state.actors).map(([k,v])=>[k,[...v]]))}}).toEqual(expected);expect(q).toEqual(before);paths.add(got.next);}expect([...paths].sort()).toEqual(['postprocess','standard']);
});
const input=()=>({actorId:0,kind:3,combined:-12,requestCodes:[3,3,255],profilePhrases:[['','Second choice']],state:{actors:{0:new Uint8Array(256),152:new Uint8Array(256).fill(7)},redirected:true,sourceText:'Lead: '}});
test('empty personal lines fall through to later matching requests rather than stopping early',()=>{
 const got=originalPhraseEntry(input());expect(got.next).toBe('postprocess');expect(got.state.sourceText).toBe('Lead: Second choice');expect(got.state.redirected).toBe(false);expect(got.hole).toBe(-1);
});
test('unmatched requests retain the phrase buffer for the standard phrase cases',()=>{
 const q=input();q.kind=9;const got=originalPhraseEntry(q);expect(got.next).toBe('standard');expect(got.state.sourceText).toBe('Lead: ');
});
test('missing required phrase data is not treated as an empty personal line',()=>{
 const q=input();q.profilePhrases=[];expect(()=>originalPhraseEntry(q)).toThrow('data is unavailable');
});
