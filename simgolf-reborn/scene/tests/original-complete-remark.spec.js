import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCompleteRemark} from '../src/simulation/original-complete-remark.js';
import {originalExplanationPopup} from '../src/simulation/original-explanation-popup.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-popup-explanation.json',import.meta.url)));
function input(){
 const q=structuredClone(rows.find(([q,r])=>q.kind===20&&r.popupRandomDraws===2)[0]);
 for(const id in q.state.actors)q.state.actors[id]=Uint8Array.from(q.state.actors[id]);
 for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);
 Object.assign(q,{globalFlags:0});Object.assign(q.state,{requestValues:Array(66).fill(0),displayText:'',priority:0});return q;
}
const context=()=>({difficulty:1,reactionMode:0,selectedActorId:-1,terrainCode:2,state:{seed:123,holeTotal:0,remarkCount:0,remarkValue:0,tileFlags:0,tileGrowth:0,worldDirty:0,positive:0,negative:0}});
const options={resolvePhrase:(e,s)=>({...s,sourceText:s.sourceText+'Gary'}),reactionContext:context,resolveEffect:(e,s)=>({state:s,result:0}),explanationContext:r=>({difficulty:1,state:r.state})};
test('reaction and popup continue one RNG stream and keep world arrays intact',()=>{
 const q=input();q.state.tileFlags=new Uint16Array([41,42]);const before=structuredClone(q);
 const result=originalCompleteRemark(q,options);
 expect(result.reaction.randomDraws).toBe(1);expect(result.explanation.popupRandomDraws).toBe(2);
 const expected=originalExplanationPopup({style:0x80007084,priority:-8,actorId:0,difficulty:1,state:{...q.state,sourceText:result.state.sourceText,seed:result.reaction.state.seed}});
 expect(result.state.seed).toBe(expected.state.seed);expect(result.state.popupStyle).toBe(0x80007084);
 expect(result.state.tileFlags).toEqual(q.state.tileFlags);expect(result.reaction.state.negative).toBe(1);
 expect(result.state.actors[0]).toEqual(result.reaction.state.actor);expect(q).toEqual(before);
});
test('fresh explanation globals can suppress a popup without consuming its RNG',()=>{
 const q=input();const result=originalCompleteRemark(q,{...options,explanationContext:r=>({difficulty:0,state:{...r.state,popupMode:3}})});
 expect(result.explanation.popupRandomDraws).toBe(0);expect(result.state.seed).toBe(result.reaction.state.seed);
 expect(result.state.lastExplanationClock).toBe(q.state.lastExplanationClock);
});
test('entry and preparation returns never read explanation globals',()=>{
 const q=input();q.globalFlags=0x2000000;
 expect(originalCompleteRemark(q).explanation).toBeNull();
 q.globalFlags=0;q.kind=19;q.requestCodes=[19,-1];q.holeRecords={[q.state.actors[0][0x21]]:new Uint8Array(520)};
 expect(originalCompleteRemark(q,options).explanation).toBeNull();
});
test('explanation snapshot is mandatory and synchronous after a continuing reaction',()=>{
 expect(()=>originalCompleteRemark(input(),{...options,explanationContext:undefined})).toThrow('world snapshot is unavailable');
 expect(()=>originalCompleteRemark(input(),{...options,explanationContext:async()=>({})})).toThrow('synchronous');
});
test('reaction early return retains randomness consumed by speech',()=>{
 const q=input();q.kind=65;q.requestCodes=[65,-1];
 const result=originalCompleteRemark(q,{...options,reactionContext:()=>({...context(),difficulty:0}),resolveEffect:(e,s)=>({state:{...s,seed:999},result:0}),explanationContext:()=>{throw Error('Must not read explanation state');}});
 expect(result.next).toBe('return');expect(result.explanation).toBeNull();expect(result.reaction.randomDraws).toBe(0);expect(result.state.seed).toBe(999);
});
