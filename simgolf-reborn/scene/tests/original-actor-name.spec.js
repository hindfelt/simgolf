import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalActorName} from '../src/simulation/original-actor-name.js';
import {originalNamedRemarkDisplay} from '../src/simulation/original-remark-display.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-actor-name.json',import.meta.url)));
test('every actor status matches original name expansion and punctuation',()=>{
 for(const [input,expected] of rows){const q={...input,actor:Uint8Array.from(input.actor)},before=structuredClone(q);expect(originalActorName(q)).toBe(expected);expect(q).toEqual(before);}expect(new Set(rows.map(([q])=>q.actor[0x18])).size).toBe(256);
});
test('named remark display resolves the profile internally and preserves source text',()=>{
 const actor=new Uint8Array(256);actor[0x21]=3;new DataView(actor.buffer).setInt16(0xb6,1,true);
 const q={actorId:0,priority:0,state:{priority:0,sourceText:'Good hole.',displayText:'',actors:[actor]}};
 const result=originalNamedRemarkDisplay(q,{profileNames:['Other','Gary'],staffNames:[]});expect(result.state.displayText).toBe('Gary (3): Good hole.');expect(result.state.sourceText).toBe('Good hole.');expect(q.state.displayText).toBe('');
});
test('unknown required names fail instead of silently substituting a golfer',()=>{
 expect(()=>originalActorName({actor:new Uint8Array(256),actorId:0,sourceText:'',profileNames:[],staffNames:[]})).toThrow('name data is unavailable');
});
