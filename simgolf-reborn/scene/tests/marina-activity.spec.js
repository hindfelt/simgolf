import {test,expect} from '@playwright/test';
import {stepMarinas,marinaPoint,validateMarinas} from '../src/simulation/marina-activity.js';
import {cellAt,key} from '../src/simulation/world.js';
import {createGame,build,openHole,update,serialize,restore,connected} from '../src/simulation/game.js';
import {transportVisitors,eligibleVisitors} from '../src/simulation/visitor-pool.js';
import {demolitionCheck} from '../src/simulation/course-edit.js';
function setup(rotation=0){const f={id:1,type:'marina',c:22,r:20,rotation};const g={time:0,facilities:[f],tiles:{},guests:[],starterBridgeRemoved:true};for(let d=-2;d<19;d+=.2)for(const side of [-1,0,1]){const p=marinaPoint(f,d,side),c=cellAt(p.x,p.z);g.tiles[key(c.c,c.r)]={type:'water'};}return g;}
const api=g=>({connected:()=>true,ready:()=>true,entrance:()=>({x:0,z:0}),arrive:()=>{g.guests=[{id:10},{id:11}];return [10,11];}});
const advance=(g,n,linked=true)=>{for(let i=0;i<n;i++){g.time+=.05;stepMarinas(g,.05,{...api(g),connected:()=>linked});}};
test('boats bring passengers, stay for both and depart in every orientation; saves resume exactly',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const g=setup(rotation);advance(g,1900);const s=g.facilities[0].marinaActivity;expect(s.offset).toBeGreaterThan(0);
  validateMarinas(g);const copy=structuredClone(g);advance(g,500);advance(copy,500);expect(copy).toEqual(g);
  expect(s.phase).toBe('parked');expect(s.guests).toEqual([10,11]);advance(g,400);expect(s.offset).toBe(0);
  g.guests.shift();advance(g,100);expect(s.phase).toBe('parked');g.guests=[];advance(g,500);expect(s.trips).toBe(1);expect(s.phase).toBe('idle');
 }
});
test('disconnected or dry marinas cannot receive boats; edited water stops a boat until repaired',()=>{
 const g=setup();advance(g,2000,false);expect(g.facilities[0].marinaActivity.phase).toBe('idle');
 advance(g,100);const s=g.facilities[0].marinaActivity,offset=s.offset,tiles=g.tiles;g.tiles={};advance(g,20);
 expect(s.offset).toBe(offset);expect(s.blocked).toBe(true);g.tiles=tiles;advance(g,500);expect(s.phase).toBe('parked');
 const dry=setup();dry.tiles={};advance(dry,2000);expect(dry.facilities[0].marinaActivity.blocked).toBe(true);
 s.offset=Infinity;expect(()=>validateMarinas(g)).toThrow();
});
test('transport adds separate persistent visitors and never consumes walk-in candidates',()=>{
 const g=createGame();const original=eligibleVisitors(g).map(p=>p.id);
 for(const type of ['marina','helipad','airstrip']){
  const pair=transportVisitors(g,type);expect(pair).toHaveLength(2);expect(pair.every(p=>!original.includes(p.id))).toBe(true);
  expect(transportVisitors(g,type).map(p=>p.id)).toEqual(pair.map(p=>p.id));
 }
 expect(g.visitorPool).toHaveLength(18);expect(eligibleVisitors(g).map(p=>p.id)).toEqual(original);
 expect(serialize(restore(serialize(g)))).toBe(serialize(g));
});
function resort(){
 const g=createGame();build(g,'tee',7,20);build(g,'green',20,20);openHole(g);
 for(let c=27;c<=33;c++)for(let r=16;r<=27;r++)expect(build(g,'water',c,r).ok).toBe(true);
 expect(build(g,'marina',30,16).ok).toBe(true);
 for(let c=8;c<=30;c++)expect(build(g,'path',c,11).ok).toBe(true);
 for(let r=12;r<=13;r++)expect(build(g,'path',30,r).ok).toBe(true);
 expect(connected(g,g.facilities[0])).toBe(true);return g;
}
test('real boat passengers finish rounds and return; occupied marina cannot be demolished',()=>{
 const g=resort();let s;
 for(let i=0;i<12000;i++){update(g,.05);s=g.facilities[0].marinaActivity;if(s.phase==='parked')break;}
 expect(s.phase).toBe('parked');expect(s.guests).toHaveLength(2);const ids=[...s.guests];
 expect(demolitionCheck(g,30,16).ok).toBe(false);
 const copy=restore(serialize(g));for(let i=0;i<500;i++){update(g,.05);update(copy,.05);}expect(serialize(copy)).toBe(serialize(g));
 for(let i=0;i<16000&&s.trips===0;i++)update(g,.05);
 expect(s.trips).toBe(1);for(const id of ids)expect(g.rounds.some(r=>r.golferId===id&&r.scorecard.length===1)).toBe(true);
});
test('browser boat samples saved travel and stays frozen while paused',async({page})=>{
 const g=resort();for(let i=0;i<12000;i++){update(g,.05);if(g.facilities[0].marinaActivity.phase==='arriving')break;}
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
 const result=await page.evaluate(async raw=>{
  const THREE=await import('/node_modules/three/build/three.module.js');const {restore}=await import('/src/simulation/game.js');
  const {buildCourseView}=await import('/src/rendering/course.js');const {setLandscapeState}=await import('/src/landscape.js');const game=restore(raw);setLandscapeState(game);
  const scene=new THREE.Scene(),view=buildCourseView(scene);view.update(game,0);
  const boat=scene.children.find(o=>o.userData.facilityType==='marina').userData.marinaBoat;
  const position=boat.position.z;view.update(game,99);return {position,paused:boat.position.z,visible:boat.visible,offset:game.facilities[0].marinaActivity.offset};
 },serialize(g));
 expect(result.visible).toBe(true);expect(result.position).toBeCloseTo(1.7+result.offset);expect(result.paused).toBe(result.position);
});
