import {test,expect} from '@playwright/test';
import {advanceClubDay,clubTime,initializeClubDay,recordClubArrival,validateClubDay} from '../src/simulation/club-day.js';
import {createGame,update,serialize,restore} from '../src/simulation/game.js';
const empty=()=>({time:0,ledger:[],guests:[]});
test('sunset reports exactly once, night lasts ten seconds and a large step crosses both boundaries',()=>{
 const g=empty();initializeClubDay(g);const step=dt=>g.time+=dt;
 advanceClubDay(g,479,step);expect(g.clubDay.reports).toHaveLength(0);
 advanceClubDay(g,1,step);expect(clubTime(g.time).night).toBe(true);expect(g.clubDay.reports).toHaveLength(1);
 advanceClubDay(g,9,step);expect(clubTime(g.time).night).toBe(true);
 advanceClubDay(g,1,step);expect(clubTime(g.time)).toMatchObject({day:2,night:false});
 advanceClubDay(g,980,step);expect(g.clubDay.reports.map(r=>r.to)).toEqual([480,970,1460]);
 validateClubDay(g);
});
test('reports reconcile actual cash movements and keep building spend separate',()=>{
 const g=empty();initializeClubDay(g);recordClubArrival(g);recordClubArrival(g);g.guests=[{happiness:4}];
 g.ledger=[{amount:100,reason:'Ada: hole 1 green fee'},{amount:3,reason:'Snack bar sale'}, {amount:200,reason:'Helicopter landing fee'},{amount:-20,reason:'Maintenance wages'},{amount:-1000,reason:'Build helipad'},{amount:-500,reason:'Buy land parcel 1'}];
 advanceClubDay(g,480,dt=>g.time+=dt);
 expect(g.clubDay.reports[0]).toMatchObject({income:303,operating:20,construction:1500,net:-1217,visitors:2,happiness:4,averageSpend:51.5,visitorChange:null});
 g.guests=[];advanceClubDay(g,490,dt=>g.time+=dt);
 expect(g.clubDay.reports[1]).toMatchObject({income:0,visitors:0,happiness:null,averageSpend:null,visitorChange:-2});
});
test('live simulation persists reports and resumes without duplicate sunset or counting the opening balance',()=>{
 const g=createGame();update(g,480);expect(g.clubDay.reports[0].income).toBe(0);
 const loaded=restore(serialize(g));update(loaded,10);expect(loaded.clubDay.reports).toHaveLength(1);expect(clubTime(loaded.time).day).toBe(2);
 update(loaded,480);expect(loaded.clubDay.reports).toHaveLength(2);
 const old=JSON.parse(serialize(g));delete old.clubDay;const migrated=restore(JSON.stringify(old));expect(migrated.clubDay.since).toBe(480);
});
test('daily report state rejects corrupted counters and retains a bounded history',()=>{
 const g=empty();advanceClubDay(g,490*35,dt=>g.time+=dt);expect(g.clubDay.reports).toHaveLength(30);validateClubDay(g);
 g.clubDay.reports[0].net=42;expect(()=>validateClubDay(g)).toThrow();
});
test('night report appears without pausing play, clears at sunrise, and remains in history on a phone',async({page})=>{
 const g=createGame();update(g,480);
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#night-report')).toBeVisible();
 await expect(page.locator('#night-report')).toContainText('Day 1');
 await page.screenshot({path:'/tmp/fairway-night-report.png'});
 await expect(page.locator('#night-report')).toBeHidden({timeout:15000});
 await expect(page.locator('#club-clock')).toContainText('Day 2');
 await page.locator('#club-clock').click();await expect(page.locator('#daily-history')).toContainText('Day 1');
 expect(errors).toEqual([]);
});
test('new walk-in visitors wait overnight and return at sunrise',async()=>{
 const {build,openHole}=await import('../src/simulation/game.js');
 const g=createGame();build(g,'tee',7,20);build(g,'green',20,20);expect(openHole(g).ok).toBe(true);
 g.time=480;g.nextArrival=0;update(g,5);expect(g.guests).toHaveLength(0);
 update(g,5);expect(g.guests).toHaveLength(2);expect(g.clubDay.visitors).toBe(2);
});
test('pre-cycle shared protocol migrates and preserves saved clock',async()=>{
 const {createProtocol,PROTOCOL_VERSION,RULESET_VERSION}=await import('../src/simulation/protocol.js');
 const g=createGame();g.protocol={...createProtocol(),version:79,ruleset:'original-signed-happiness-2026-09-12'};
 const loaded=restore(serialize(g));expect(loaded.protocol).toMatchObject({version:PROTOCOL_VERSION,ruleset:RULESET_VERSION});expect(loaded.time).toBe(0);
});
test('unhappy golfers and negative green fees remain signed through save validation',()=>{
 const g=empty();initializeClubDay(g);recordClubArrival(g);g.guests=[{happiness:-3}];
 g.ledger.push({amount:-300,reason:'Ada: hole 1 green fee'});
 advanceClubDay(g,480,dt=>g.time+=dt);validateClubDay(g);
 expect(g.clubDay.reports[0]).toMatchObject({happiness:-3,averageSpend:-300,operating:300,net:-300});
});
test('legacy saves opened during night identify their first accounting period as partial',()=>{
 const g=empty();g.time=485;initializeClubDay(g);advanceClubDay(g,485,dt=>g.time+=dt);
 expect(g.clubDay.reports[0]).toMatchObject({day:2,from:485,to:970,partial:true});
});
