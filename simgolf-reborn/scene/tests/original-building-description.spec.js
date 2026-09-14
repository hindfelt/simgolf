import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalBuildingDescription} from '../src/simulation/original-building-description.js';
import {originalDescribedPhrasePostprocess} from '../src/simulation/original-phrase-postprocess.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-building-description.json',import.meta.url)));
test('all original landmark names and detailed forms match the native helper',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalBuildingDescription(q)).toEqual(expected);expect(q).toEqual(before);}
});
test('golfer location remarks resolve original landmark records without a placeholder',()=>{
 for(let id=0;id<20;id++){
  const actor=new Uint8Array(256),q={actorId:0,kind:20,value:1070,state:{sourceText:'MYNAME visits DATA.',actors:{0:actor,1:actor.slice()}}};
  const before=structuredClone(q);
  const result=originalDescribedPhrasePostprocess(q,{profileNames:['Gary'],staffNames:[]},()=>({objects:{3:{type:4,value:id}},terrainTypes:{},map:{tileAt:(c,r)=>{expect([c,r]).toEqual([20,21]);return 22;},detailAt:()=>3}}));
  const native=rows.find(([input])=>input.buildingId===id&&input.detailed===0&&input.state.sourceText==='')[1].sourceText;
  expect(result.state.sourceText).toBe(`Gary visits ${native}.`);
  expect(result.locationEvents).toEqual([{address:0x407270,args:[id,0]}]);expect(q).toEqual(before);
 }
});
