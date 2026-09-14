import {test,expect} from '@playwright/test';
import {stepAircraft,aircraftPose,validateAircraft} from '../src/simulation/aircraft.js';
import {createGame,build,openHole,update,restore,serialize} from '../src/simulation/game.js';
import {demolitionCheck} from '../src/simulation/course-edit.js';
test('aircraft lands before admitting passengers, stays for both and schedules its next flight after departure',()=>{
 const g={time:0,facilities:[{id:1,type:'airstrip',nextFlight:0}],guests:[],guestRoster:[]};let admitted=0;
 const api={connected:()=>true,ready:()=>true,entrance:()=>({x:0,z:0}),arrive:()=>{admitted++;g.guests=[{id:1},{id:2}];return [1,2];},event:()=>{}};
 const f=g.facilities[0];stepAircraft(g,api);expect(f.aircraft.phase).toBe('approach');expect(admitted).toBe(0);
 for(const [time,phase] of [[20,'landing'],[32,'taxiIn'],[42,'unloading'],[47,'parked']]){g.time=time;stepAircraft(g,api);expect(f.aircraft.phase).toBe(phase);}
 expect(admitted).toBe(1);expect(f.served).toBe(2);g.time=1000;stepAircraft(g,api);expect(f.aircraft.phase).toBe('parked');
 g.guests.shift();stepAircraft(g,api);expect(f.aircraft.phase).toBe('parked');g.guests=[];stepAircraft(g,api);expect(f.aircraft.phase).toBe('boarding');
 for(const [time,phase] of [[1005,'taxiOut'],[1015,'departing']]){g.time=time;stepAircraft(g,api);expect(f.aircraft.phase).toBe(phase);}
 g.time=1030;stepAircraft(g,api);expect(f.aircraft).toBeUndefined();expect(f.nextFlight).toBe(1510);expect(admitted).toBe(1);validateAircraft(g);
});
test('disconnecting before unloading sends an empty aircraft away; night delays admission',()=>{
 const f={id:1,type:'airstrip',aircraft:{phase:'unloading',since:0,guests:[]}},g={time:6,facilities:[f],guests:[]};let linked=true,ready=false;
 const api={connected:()=>linked,ready:()=>ready,arrive:()=>{throw Error('No arrival expected');},event:()=>{}};
 stepAircraft(g,api);expect(f.aircraft.phase).toBe('unloading');linked=false;stepAircraft(g,api);expect(f.aircraft.phase).toBe('taxiOut');
});
test('flight positions join continuously and parked propellers stop',()=>{
 const phases=[['approach',20,'landing'],['landing',12,'taxiIn'],['taxiIn',10,'unloading'],['boarding',5,'taxiOut'],['taxiOut',10,'departing']];
 for(const [phase,duration,next] of phases){const a=aircraftPose({phase,since:0},duration),b=aircraftPose({phase:next,since:duration},duration);for(const k of ['x','y','z','heading'])expect(a[k]).toBeCloseTo(b[k],6);}
 expect(aircraftPose({phase:'parked',since:0},900).propeller).toBe(false);
});
function resort(){const g=createGame();build(g,'tee',7,20);build(g,'green',36,5);build(g,'airstrip',22,15);for(let c=8;c<=22;c++)build(g,'path',c,11);openHole(g);g.facilities[0].nextFlight=0;return g;}
test('occupied airstrip is protected, flight restores exactly, and passengers complete real rounds',()=>{
 const g=resort();for(let i=0;i<16000&&g.facilities[0].aircraft?.phase!=='parked';i++)update(g,.05);const f=g.facilities[0];expect(f.aircraft.phase).toBe('parked');const ids=[...f.aircraft.guests];expect(ids).toHaveLength(2);expect(demolitionCheck(g,22,15).ok).toBe(false);
 const copy=restore(serialize(g));for(let i=0;i<16000&&g.facilities[0].aircraft;i++){update(g,.05);update(copy,.05);}expect(serialize(copy)).toBe(serialize(g));expect(g.facilities[0].aircraft).toBeUndefined();
 for(const id of ids)expect(g.rounds.some(r=>r.golferId===id)).toBe(true);
});
test('browser shows an approaching aircraft over the resort',async({page})=>{
 const g=resort();for(let i=0;i<320;i++)update(g,.05);
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('#pause').click();
 await page.screenshot({path:'/tmp/fairway-aircraft-approach.png'});expect(errors).toEqual([]);
 expect(await page.evaluate(()=>window.__gameTest.getState().facilities[0].aircraft.phase)).toBe('approach');
});
