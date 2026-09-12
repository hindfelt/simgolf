import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalReactedRemark} from '../src/simulation/original-reacted-remark.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-reacted-native.json',import.meta.url)));
for(const [q,out] of rows){if(out.before)out.before=Uint8Array.from(out.before);if(out.reaction)out.reaction.state.actor=Uint8Array.from(out.reaction.state.actor);
 for(const key of ['profileHistory','holeRecords','profileRecords'])if(q[key])for(const id in q[key])q[key][id]=Uint8Array.from(q[key][id]);
 for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);
}
test('complete remark flow through reaction matches uninterrupted original execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);const result=originalReactedRemark(q,(e,s)=>{
  if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
  return {...s,remarkStyle:12345,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[2]};
 },()=>q.resourceLines,(e,s)=>s,()=>q.reactionContext,(e,s)=>({state:s,result:0}));expect(result).toEqual(expected);expect(q).toEqual(before);}
 const standard=new Set(rows.filter(([q])=>q.requestCodes[0]===254).map(([q])=>q.kind));for(let kind=1;kind<=65;kind++)expect(standard.has(kind)).toBe(true);
});




test('native matrix includes happiness changes, terrain growth and early exits',()=>{
 expect(rows.some(([,out])=>out.reaction?.delta<0)).toBe(true);
 expect(rows.some(([,out])=>out.reaction?.delta>0)).toBe(true);
 expect(rows.some(([,out])=>out.reaction?.state.tileGrowth===1)).toBe(true);
 expect(rows.some(([,out])=>out.allowed&&out.reaction===null)).toBe(true);
 expect(rows.some(([,out])=>!out.allowed)).toBe(true);
 for(const [,out] of rows)if(out.reaction)expect(out.state.actors).toHaveProperty(String(out.receiver));
});
