import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoScenery} from '../src/simulation/original-auto-scenery.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-scenery.json',import.meta.url),'utf8'));
const mapFor=q=>({heightAt:(x,z)=>q.heightBase+((x+z)&3),
 terrainAt:(x,z)=>{const i=x*50+z;if(i<0||i>=2500)return 0;x=Math.floor(i/50);z=i%50;return (x-z)%7===0?3:[2,19,21,22][(x+z)%4];},
 marksAt:(x,z)=>(x+z)%6===0?0x100:0,kindAt:code=>code===3?13:0,categoryAt:code=>[21,22].includes(code)?16:0,
 objectIndexAt:(x,z)=>x%2?0:-1,objectAt:index=>index===-1?q.missingRecord:q.record});
test('complete scenery loops match native references, counters and random state',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);expect(originalAutoScenery(q,mapFor(q))).toEqual(e);
  expect(JSON.stringify(q)).toBe(before);expect(e.randomDraws).toBe(e.samples*2);
 }
 for(const field of ['scannedTile','sceneryTile','namedReference'])expect(rows.some(([q,e])=>e[field]!==q.state[field])).toBe(true);
});
test('nonpositive sample count preserves references and RNG while recording the shot',()=>{
 const q=rows[0][0];
 const result=originalAutoScenery(q,{heightAt:()=>-1});
 expect(result).toEqual({...q.state,holeCounter:q.state.holeCounter+1,samples:0,randomDraws:0});
});
test('serialized scenery snapshots replay deterministically',()=>{
 const [q]=rows.find(([,e])=>e.samples>0);
 const replay=JSON.parse(JSON.stringify(q));
 expect(originalAutoScenery(replay,mapFor(replay))).toEqual(originalAutoScenery(q,mapFor(q)));
});
