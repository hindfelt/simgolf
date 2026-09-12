import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutoLaunchHistory} from '../src/simulation/original-auto-launch-history.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-auto-launch-history.json',import.meta.url),'utf8'));
test('club history and ordered stateful remark requests match executable',()=>{
 for(const [q,e] of rows){
  const before=JSON.stringify(q);
  const a=originalAutoLaunchHistory(q,{heightAt:(x,z)=>x===q.actor.target.x&&z===q.actor.target.z?q.targetHeight:q.originHeight},(event,actor)=>{
   if(q.effect==='marker')actor.marker=(actor.marker+1)&255;
   if(q.effect==='reaction')actor.reaction=1;
   return actor;
  });
  expect(a).toEqual(e);expect(JSON.stringify(q)).toBe(before);
 }
 expect(new Set(rows.flatMap(([,e])=>e.events.map(event=>event.kind)))).toEqual(new Set([0x36,0x2d,0x2e,0x3e]));
});
test('club remark state changes suppress subsequent terrain queries',()=>{
 const q={actorId:0,previousMarker:1,terrainCode:1,origin:{x:25,z:25},
  actor:{marker:1,reaction:0,actorClass:0,club:3,hole:4,shotCounter:0,usedClubs:0,target:{x:30,z:25}}};
 const a=originalAutoLaunchHistory(q,{heightAt:()=>{throw Error('Stale state allowed a terrain read');}},(event,actor)=>({...actor,marker:2}));
 expect(a.events).toEqual([{actorId:0,kind:0x36,value:3}]);
 expect(a.actor.usedClubs).toBe(8);
 expect(q.actor.usedClubs).toBe(0);
});
test('active reaction invalidates the comparison marker but still records club usage',()=>{
 const q={actorId:0,previousMarker:1,terrainCode:1,origin:{x:25,z:25},
  actor:{marker:1,reaction:1,actorClass:0,club:13,hole:4,shotCounter:0,usedClubs:0,target:{x:30,z:25}}};
 const a=originalAutoLaunchHistory(q,{heightAt:()=>{throw Error('Unexpected terrain read');}},()=>{throw Error('Unexpected remark');});
 expect(a.comparisonMarker).toBe(-1);expect(a.events).toEqual([]);expect(a.actor.usedClubs).toBe(8192);
});
