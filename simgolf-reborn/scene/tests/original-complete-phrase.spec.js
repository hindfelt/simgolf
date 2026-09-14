import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCompletePhrase} from '../src/simulation/original-complete-phrase.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-complete-phrase.json',import.meta.url)));
for(const [q,out] of rows){
 for(const key of ['profileHistory','holeRecords','profileRecords'])if(q[key])for(const id in q[key])q[key][id]=Uint8Array.from(q[key][id]);
 for(const state of [q.state,out.state])for(const id in state.actors)state.actors[id]=Uint8Array.from(state.actors[id]);
}
const resolve=q=>(e,s)=>{
 if(q.mutateProfile&&e.address===0x466fb0)s.actors[q.actorId][0xb6]^=1;
 return {...s,remarkStyle:12345,sourceText:s.sourceText.split('\0',1)[0]+(e.address===0x466fb0?'Name'+e.args[0]:'Place'+e.args[2])};
};
test('complete original phrase flow matches contiguous executable execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalCompletePhrase(q,resolve(q),()=>q.resourceLines)).toEqual(expected);expect(q).toEqual(before);}
 const standard=new Set(rows.filter(([q])=>q.requestCodes[0]===254).map(([q])=>q.kind));
 for(let kind=1;kind<=65;kind++)expect(standard.has(kind)).toBe(true);
});
test('personal substitutions interpret original terrain category as one byte',()=>{
 const [q,expected]=rows.find(([q])=>q.requestCodes[0]===10&&q.terms?.[q.value]?.type===269);
 expect(originalCompletePhrase(q,resolve(q))).toEqual(expected);
 expect(expected.state.sourceText).toContain(q.terms[q.value].alternate);
});
