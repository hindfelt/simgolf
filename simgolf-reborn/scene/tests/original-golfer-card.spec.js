import {test,expect} from '@playwright/test';
import {originalGolferCard} from '../src/simulation/original-golfer-card.js';
const card=(state,actorId=0)=>originalGolferCard(state,{actorId,portraitId:2,x:350,title:'Player'});
const fresh=()=>({actors:Array.from({length:152},()=>new Uint8Array(256)),defaultSkills:new Uint8Array(10).fill(3),actorTableTail:new Uint8Array([9,10])});
test('personal card reads ten native bytes, including next-record recovery and luck',()=>{
 const s=fresh();s.actors[0][0xbe]=1;s.actors[0].set([1,2,3,4,5,6,7,8],0xf8);s.actors[1].set([9,10]);const before=structuredClone(s);
 const result=card(s);expect(result.skills.map(r=>r.value)).toEqual([1,2,3,4,5,6,7,8,9,10]);
 expect(result.skills[8]).toEqual({label:'Recovery Skills',value:9,percent:90,active:true});expect(s).toEqual(before);
});
test('unassigned and anonymous cards read the shared default skills',()=>{
 const s=fresh();s.defaultSkills[0]=0;expect(card(s).skills.map(r=>r.value)).toEqual([0,3,3,3,3,3,3,3,3,3]);
 expect(card(s,-1).skills).toEqual(card(s).skills);expect(card(s).skills[0].active).toBe(false);
});
test('last actor uses explicit adjacent backing and never invents missing skills',()=>{
 const s=fresh();s.actors[151][0xbf]=128;expect(card(s,151).skills.slice(8).map(r=>r.value)).toEqual([9,10]);
 delete s.actorTableTail;expect(()=>card(s,151)).toThrow('tail');
 delete s.defaultSkills;expect(()=>card(s,-1)).toThrow('default skills');
});
test('tutorial draw events use their current text, portrait and actor',async()=>{
 const {originalTutorialGolferCard}=await import('../src/simulation/original-golfer-card.js');
 const state={...fresh(),sourceText:'Rival vs...'},event={address:0x45e9c0,args:[0x518f78,7,-1,3,350]};
 expect(originalTutorialGolferCard(event,state)).toMatchObject({actorId:3,portraitId:7,x:350,title:'Rival vs...'});
 event.args[2]=1;expect(()=>originalTutorialGolferCard(event,state)).toThrow('Unsupported');
});
