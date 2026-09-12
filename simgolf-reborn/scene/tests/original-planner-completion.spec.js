import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPlannerEffect} from '../src/simulation/original-planner-effect.js';
import {applyOriginalPlannerActor} from '../src/simulation/original-planner-actor.js';
import {applyOriginalPlannerResult} from '../src/simulation/original-planner-result.js';
import {middleMap,middleEffects} from './helpers/original-auto-middle-map.js';
const [q]=JSON.parse(readFileSync(new URL('./fixtures/original-direct-automatic-planner.json',import.meta.url)))[0];
function snapshot(){
 const s=applyOriginalPlannerActor({actorId:0,actors:[new Uint8Array(256),new Uint8Array(256)],holes:Array.from({length:20},()=>new Uint8Array(520)),metadata:Array.from({length:32},()=>({})),seed:q.state.seed,strengthCache:q.state.cache,diagnostics:0,landing:q.state.landing},q.state);
 const a=new DataView(s.actors[0].buffer),p=q.planning,h=new DataView(s.holes[q.state.actor.hole].buffer);
 for(const [offset,n] of [[8,q.position.x],[12,q.position.z],[0xdc,p.x],[0xe0,p.z]])a.setInt32(offset,n,true);
 a.setInt16(0xaa,1,true);a.setUint16(0x1e,p.abilityFlags,true);a.setInt8(0x3e,p.attitude);
 for(const [offset,n] of [[0xfa,p.driverValue],[0xfb,p.ironValue],[0xfc,p.abilityValue],[0xfd,p.drawValue],[0xfe,p.fadeValue],[0xff,p.backspinValue],[0xc2,p.rangeInput.level],[0xf8,p.rangeInput.power],[0xf9,p.rangeInput.longDrive]])a.setUint8(offset,n);
 h.setInt32(0x18,p.cup.x,true);h.setInt32(0x1c,p.cup.z,true);return s;
}
const event={address:0x4235c0,args:[0,1,-1,0,q.planning.curve]};
test('scheduler planner commits through the effect-owned world exactly once',()=>{
 const s=snapshot(),before=structuredClone(s);let completed=0;
 const effects={...middleEffects(q),complete:planner=>{completed++;return applyOriginalPlannerResult({...s,sourceText:'Retained reaction',cashTotal:1234},planner);}};
 const result=originalPlannerEffect(event,s,q,{map:{planning:middleMap(q)}},effects);
 expect(completed).toBe(1);expect(result.state.sourceText).toBe('Retained reaction');expect(result.state.cashTotal).toBe(1234);
 expect(result.state.seed).toBe(result.planner.state.seed);expect(s).toEqual(before);
 const standard=originalPlannerEffect(event,s,q,{map:{planning:middleMap(q)}},middleEffects(q));
 expect(standard.planner).toEqual(result.planner);expect(standard.state.actors).toEqual(result.state.actors);
});
test('planner rejects asynchronous completion rather than returning a promise as world state',()=>{
 expect(()=>originalPlannerEffect(event,snapshot(),q,{map:{planning:middleMap(q)}},{...middleEffects(q),complete:()=>Promise.resolve({})})).toThrow('synchronous world');
});
