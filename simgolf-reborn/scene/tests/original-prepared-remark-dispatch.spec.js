import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPreparedRemarkDispatch} from '../src/simulation/original-remark-dispatch.js';
import {originalActorName} from '../src/simulation/original-actor-name.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-prepared-remark-dispatch.json',import.meta.url)));
for(const [q,out] of rows){if(out.before)out.before=Uint8Array.from(out.before);
 for(const key of ['profileHistory','holeRecords','profileRecords'])if(q[key])for(const id in q[key])q[key][id]=Uint8Array.from(q[key][id]);
 for(const s of [q.state,out.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);
}
test('eligibility through display and history preparation match continuous native execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);const result=originalPreparedRemarkDispatch(q,(e,s)=>{
  if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}
  return {...s,remarkStyle:12345,sourceText:s.sourceText.split('\0',1)[0]+'Place'+e.args[2]};
 },()=>q.resourceLines,(e,s)=>s);expect(result).toEqual(expected);expect(q).toEqual(before);}
 const standard=new Set(rows.filter(([q])=>q.requestCodes[0]===254).map(([q])=>q.kind));for(let kind=1;kind<=65;kind++)expect(standard.has(kind)).toBe(true);
});



test('native histories include post-display pending fields and original return paths',()=>{
 const adjusted=rows.filter(([,out])=>out.next==='adjustment');expect(adjusted.length).toBeGreaterThan(0);
 for(const [q,out] of adjusted){expect(out.before).toHaveLength(256);expect(out.state.actors[q.actorId][0x70]).toBe(out.kind&255);expect(Number.isInteger(out.voiceOffset)).toBe(true);}
 const repeated=rows.find(([q,out])=>q.kind===35&&out.allowed&&out.next==='return');
 expect(repeated[1].preparationEvents.map(e=>e.address)).toEqual([0x46c140,0x40c1f0]);expect(repeated[1].before).toBeNull();
 const score=rows.find(([q,out])=>q.kind===19&&out.kind===19&&out.allowed);
 expect(score[1].next).toBe('return');expect(score[1].preparationEvents).toEqual([]);
});
