import {test,expect} from '@playwright/test';
import {createGame,build,openHole,update,serialize,restore,connected} from '../src/simulation/game.js';
import {scheduleTennis,stepTennisVisit,validateTennis,TENNIS_SECONDS} from '../src/simulation/tennis-visits.js';
import {tennisPose} from '../src/rendering/tennis-activity.js';
const setup=()=>({time:10,facilities:[{id:1,type:'tennis-court',c:15,r:15,served:0}],stats:{services:0},guests:[1,2].map(id=>({id,pair:1,paid:true,roundFinished:true,phase:'finished',pos:{x:0,z:0}}))});
const access={connected:()=>true,entrance:()=>({x:1,z:1}),route:()=>[{x:1,z:1}]};
const leave=(_g,v)=>{v.phase='walking';v.afterWalk='departed';delete v.serviceId;};
test('partners reserve together, play once, finish without invented fees and retain deterministic poses',()=>{
 const g=setup();scheduleTennis(g,access);expect(g.guests.every(v=>v.tennisPlayed)).toBe(true);
 g.guests.forEach(v=>{v.phase='service';});
 stepTennisVisit(g,g.guests[0],{connected:access.connected,leave});
 expect(g.guests.map(v=>v.tennis.startedAt)).toEqual([10,10]);
 g.time+=5;const copy=structuredClone(g);expect(tennisPose(g,g.guests[0])).toEqual(tennisPose(copy,copy.guests[0]));
 g.time+=TENNIS_SECONDS;g.guests.forEach(v=>stepTennisVisit(g,v,{connected:access.connected,leave}));
 expect(g.stats.services).toBe(2);expect(g.facilities[0].served).toBe(2);
 scheduleTennis(g,access);expect(g.guests.every(v=>!v.tennis)).toBe(true);
});
test('disconnection, demolition, missing partner and unreachable route do not grant visits or strand reservations',()=>{
 for(const mode of ['disconnected','demolished','partner']){
  const g=setup();scheduleTennis(g,access);const v=g.guests[0];
  if(mode==='demolished')g.facilities=[];if(mode==='partner')g.guests.pop();
  stepTennisVisit(g,v,{connected:()=>mode!=='disconnected',leave});
  expect(v.tennis).toBeUndefined();expect(v.afterWalk).toBe('departed');expect(g.stats.services).toBe(0);
 }
 const g=setup();scheduleTennis(g,{...access,route:()=>null});expect(g.guests.every(v=>!v.tennis)).toBe(true);
 g.courseLocked=true;scheduleTennis(g,access);expect(g.guests.every(v=>!v.tennis)).toBe(true);
});
test('reservation validation rejects corrupt clocks and player identities',()=>{
 const g=setup();scheduleTennis(g,access);const v=g.guests[0];expect(()=>validateTennis(g,v)).not.toThrow();
 v.tennis.startedAt=999;expect(()=>validateTennis(g,v)).toThrow();v.tennis.startedAt=null;
 v.tennis.partnerId=v.id;expect(()=>validateTennis(g,v)).toThrow();
});
test('live visitors play after their round; mid-visit saves resume identically',()=>{
 const g=createGame(22);expect(build(g,'tee',7,20).ok).toBe(true);expect(build(g,'green',23,17).ok).toBe(true);
 expect(build(g,'tennis-court',14,12).ok).toBe(true);
 for(let c=8;c<=10;c++)expect(build(g,'path',c,12).ok).toBe(true);
 expect(connected(g,g.facilities[0])).toBe(true);expect(openHole(g).ok).toBe(true);
 for(let i=0;i<12000&&!g.guests.some(v=>v.tennis?.startedAt!=null);i++)update(g,.05);
 const active=g.guests.find(v=>v.tennis?.startedAt!=null);expect(active).toBeTruthy();
 const copy=restore(serialize(g));for(let i=0;i<700;i++){update(g,.05);update(copy,.05);}
 expect(serialize(copy)).toBe(serialize(g));expect(g.facilities[0].served).toBeGreaterThanOrEqual(2);
});
test('browser renders the actual saved pair on court and freezes the rally when paused',async({page})=>{
 const g=createGame(22);build(g,'tee',7,20);build(g,'green',23,17);build(g,'tennis-court',14,12);
 for(let c=8;c<=10;c++)build(g,'path',c,12);openHole(g);
 for(let i=0;i<12000&&!g.guests.some(v=>v.tennis?.startedAt!=null);i++)update(g,.05);
 for(let i=0;i<80;i++)update(g,.05);
 const players=g.guests.filter(v=>v.tennis?.startedAt!=null);expect(players.length).toBe(2);
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#pause').click();
 const state=await page.evaluate(()=>window.__gameTest.getState());
 const actors=await page.evaluate(()=>window.__gameTest.getVisibleActors());
 for(const v of state.guests.filter(v=>v.tennis?.startedAt!=null)){
  const pose=tennisPose(state,v),actor=actors.find(a=>a.id===v.id);
  expect(actor.x).toBeCloseTo(pose.x,4);expect(actor.z).toBeCloseTo(pose.z,4);expect(actor.ball.visible).toBe(false);
 }
 const first=await page.evaluate(()=>window.__gameTest.getVisibleActors());
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 expect(await page.evaluate(()=>window.__gameTest.getVisibleActors())).toEqual(first);
 await page.screenshot({path:'/tmp/simgolf-tennis-visits.png'});
});
test('a lone departing golfer does not prevent a later pair from reserving the court',()=>{
 const g=setup();g.guests.unshift({...g.guests[0],id:10,pair:10});scheduleTennis(g,access);
 expect(g.guests[0].tennis).toBeUndefined();expect(g.guests.slice(1).every(v=>v.tennis)).toBe(true);
});
test('old saved resorts migrate receipts without losing their course or finances',async()=>{
 const {createProtocol,migrateProtocol,PROTOCOL_VERSION,RULESET_VERSION}=await import('../src/simulation/protocol.js');
 const g=createGame();g.protocol={...createProtocol(),version:75,ruleset:'prototype-boundary-regions-2026-09-10'};
 const before={cash:g.cash,holes:structuredClone(g.holes)};
 const next=restore(serialize(g));migrateProtocol(next.protocol);
 expect(next.cash).toBe(before.cash);expect(next.holes).toEqual(before.holes);
 expect(next.protocol.version).toBe(PROTOCOL_VERSION);expect(next.protocol.ruleset).toBe(RULESET_VERSION);
});
