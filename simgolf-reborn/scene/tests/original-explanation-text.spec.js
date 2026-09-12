import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalExplanationText} from '../src/simulation/original-explanation-text.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-explanation-text.json',import.meta.url)));
test('all explanation branches and substitutions match original assembly',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalExplanationText(q,(e,s)=>({...s,remarkStyle:91,sourceText:s.sourceText.split('\0',1)[0]+(e.address===0x466fb0?'Name'+e.args[0]:'Place'+e.args[0]+','+e.args[1])}))).toEqual(expected);expect(q).toEqual(before);}
 expect(new Set(rows.map(([q])=>q.kind)).size).toBe(67);
});
test('unexplained kinds clear the quotation rather than displaying incomplete help',()=>{
 const q={kind:7,state:{sourceText:"'A remark' Gary",remarkStyle:42}};
 expect(originalExplanationText(q)).toEqual({state:{sourceText:'',remarkStyle:42},events:[]});
 expect(originalExplanationText({...q,kind:999})).toEqual({state:{sourceText:'',remarkStyle:42},events:[]});
});
test('missing dynamic text and helpers remain explicit errors',()=>{
 expect(()=>originalExplanationText({kind:2,value:0,pronoun:'he',state:{sourceText:''}})).toThrow('substitution is unavailable');
 expect(()=>originalExplanationText({kind:31,actorId:0,state:{sourceText:''}})).toThrow('requires a resolver');
});
