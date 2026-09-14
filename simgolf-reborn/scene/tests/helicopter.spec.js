import { test, expect } from '@playwright/test';
import { stepHelicopter, validateHelicopter } from '../src/simulation/helicopter.js';

test('one helicopter lands, charges once, stays for both golfers and leaves before another visit', () => {
  const g={time:0,nextId:8,facilities:[{id:1,type:'helipad',c:10,r:10}],guests:[]};
  const fees=[];
  const api={ready:()=>true,entrance:()=>({x:0,z:0}),money:(n)=>fees.push(n),event:()=>{},arrive:()=>{g.guests=[{id:10},{id:11}];return [10,11];}};
  stepHelicopter(g,api);expect(g.helicopter).toBeUndefined();
  g.time=300;stepHelicopter(g,api);expect(g.helicopter.phase).toBe('arriving');
  g.time=324;stepHelicopter(g,api);expect(fees).toEqual([200]);
  const saved=structuredClone(g);validateHelicopter(saved);stepHelicopter(saved,api);expect(fees).toEqual([200]);
  g.time=329;stepHelicopter(g,api);expect(g.helicopter.phase).toBe('parked');
  g.time=1000;stepHelicopter(g,api);expect(g.helicopter.phase).toBe('parked');
  g.guests.shift();stepHelicopter(g,api);expect(g.helicopter.phase).toBe('parked');
  g.guests=[];stepHelicopter(g,api);expect(g.helicopter.phase).toBe('boarding');
  g.time+=5;stepHelicopter(g,api);expect(g.helicopter.phase).toBe('departing');
  g.time+=20;stepHelicopter(g,api);expect(g.helicopter).toBeNull();
  expect(g.nextHelicopter).toBeGreaterThanOrEqual(g.time+600);
  stepHelicopter(g,api);expect(g.helicopter).toBeNull();
});

import {createGame,build,openHole,update,restore,serialize} from '../src/simulation/game.js';
import {demolitionCheck} from '../src/simulation/course-edit.js';
function resort() {
  const g=createGame();build(g,'tee',7,20);build(g,'green',20,20);openHole(g);
  build(g,'helipad',22,14);for(let c=8;c<=22;c++)build(g,'path',c,11);
  g.nextHelicopter=0;return g;
}
test('real visitors play their round, return and release the helipad; save resumes without another fee',()=>{
  let g=resort();
  for(let i=0;i<600;i++)update(g,.05);
  expect(g.helicopter.phase).toBe('parked');
  const ids=[...g.helicopter.guests];expect(ids).toHaveLength(2);
  expect(demolitionCheck(g,22,14).ok).toBe(false);
  g=restore(serialize(g));
  for(let i=0;i<6000 && g.helicopter;i++)update(g,.05);
  expect(g.helicopter).toBeNull();
  expect(g.ledger.filter(e=>e.reason==='Helicopter landing fee').map(e=>e.amount)).toEqual([200]);
  for(const id of ids) expect(g.rounds.some(r=>r.golferId===id && r.scorecard.length===1)).toBe(true);
});

test('browser renders the landed helicopter and disembarking passengers',async({page})=>{
  const g=resort();for(let i=0;i<490;i++)update(g,.05);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
  await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
  await page.locator('#pause').click();
  await page.screenshot({path:'/tmp/simgolf-helicopter.png'});
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>window.__gameTest.getState().helicopter.phase)).toBe('unloading');
});
