import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLocationDescription} from '../src/simulation/original-location-description.js';
import {ORIGINAL_LOCATION_STRINGS} from '../src/simulation/original-location-strings.js';
import {originalDescribedPhrasePostprocess} from '../src/simulation/original-phrase-postprocess.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-location-description.json',import.meta.url)));
test('original terrain and object descriptions match native output and building calls',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q),cell=(c,r)=>q.cells[`${c},${r}`];const result=originalLocationDescription(q,{tileAt:(c,r)=>cell(c,r).tile,flagsAt:(c,r)=>cell(c,r).flags,detailAt:(c,r)=>cell(c,r).detail},(e,s)=>({...s,sourceText:s.sourceText+'Building'+e.args[0]}));expect(result).toEqual(expected);expect(q).toEqual(before);}
 for(const label of Object.values(ORIGINAL_LOCATION_STRINGS))expect(rows.some(([,out])=>out.state.sourceText==='Near '+label),label).toBe(true);
});
test('phrase substitution uses recovered location rules with authoritative map inputs',()=>{
 const actor=new Uint8Array(256),q={actorId:0,kind:20,value:1070,state:{sourceText:'MYNAME visits DATA.',actors:{0:actor,1:actor.slice()}}};
 const result=originalDescribedPhrasePostprocess(q,{profileNames:['Gary'],staffNames:[]},()=>({objects:{},terrainTypes:{17:17},environmentCode:0,worldType:7,map:{tileAt:(c,r)=>{expect([c,r]).toEqual([20,21]);return 17;},flagsAt:()=>32,detailAt:()=>0}}));
 expect(result.state.sourceText).toBe('Gary visits scenic bridge.');expect(result.locationEvents).toEqual([]);expect(q.state.sourceText).toBe('MYNAME visits DATA.');
});
