import {test,expect} from '@playwright/test';
import {createGame,build,startPractice,openHole,update,takeShot,serialize,restore} from '../src/simulation/game.js';
import {key} from '../src/simulation/world.js';
function course(){const g=createGame();build(g,'tee',7,20);build(g,'green',22,10);return g;}
test('actual automatic putting runs recovered motion and survives a mid-roll save',()=>{
 const g=course();startPractice(g);const cup=g.holes[0].green;
 g.pro.ball={x:cup.x-1,z:cup.z};g.pro.pos={...g.pro.ball};g.rng=1234;
 for(let i=0;i<40&&!g.pro.shot;i++)update(g,.05);
 update(g,.05);expect(g.pro.shot.nativePutt.state.steps).toBeGreaterThan(0);expect(g.pro.shot.club).toBe(13);
 const copy=restore(serialize(g));
 for(let i=0;i<1500&&g.pro.phase!=='finished';i++){update(g,.05);update(copy,.05);}
 expect(g.pro.phase).toBe('finished');expect(serialize(copy)).toBe(serialize(g));expect(g.pro.scorecard).toHaveLength(1);
});
test('sloped greens use explicitly marked live contour forces with native putting',()=>{
 const g=course();startPractice(g);const cup=g.holes[0].green;g.pro.ball={x:cup.x-1,z:cup.z};g.pro.pos={...g.pro.ball};g.elevation={[key(22,10)]:2};
 takeShot(g,g.pro,cup);expect(g.pro.shot.putt).toBe(true);expect(g.pro.shot.nativePutt.contours).toBe(true);
});
test('a live paid visitor round uses original club selection through scoring and fee settlement',()=>{
 const g=course();openHole(g);let nativeShots=0;
 for(let i=0;i<8000&&g.stats.holesCompleted<1;i++){
  update(g,.05);for(const v of g.guests){if(v.shot?.club!==undefined)nativeShots++;}
 }
 expect(nativeShots).toBeGreaterThan(0);expect(g.stats.holesCompleted).toBeGreaterThan(0);expect(g.holes[0].stats.evaluation.activity.starts).toBeGreaterThan(0);
 expect(g.ledger.some(e=>e.reason.includes('green fee'))).toBe(true);expect(restore(serialize(g)).stats).toEqual(g.stats);
});
test('legacy saves keep legacy flight and reject malformed recovered putt state',()=>{
 const g=course();startPractice(g);delete g.liveSimulationVersion;const old=restore(serialize(g));takeShot(old,old.pro,old.holes[0].green);expect(old.pro.shot.club).toBeUndefined();
 const fresh=course();startPractice(fresh);const cup=fresh.holes[0].green;fresh.pro.ball={x:cup.x-1,z:cup.z};fresh.pro.pos={...fresh.pro.ball};takeShot(fresh,fresh.pro,cup);
 expect(fresh.pro.shot.nativePutt).toBeDefined();fresh.pro.shot.nativePutt.state.ball.x=Infinity;expect(()=>restore(serialize(fresh))).toThrow();
});
test('a stopped putt outside the native cup stays live even inside the old gimme radius',()=>{
 const g=course();startPractice(g);const cup=g.holes[0].green;
 g.pro.ball={x:cup.x-.4,z:cup.z};g.pro.pos={...g.pro.ball};takeShot(g,g.pro,cup);
 const p=g.pro.shot.nativePutt;p.state.status='stopped';p.state.ball.speed=0;
 update(g,.05);expect(g.pro.phase).not.toBe('finished');expect(g.pro.scorecard).toHaveLength(0);
 const cache=structuredClone(g.liveStrengthCache);expect(cache.entries.some(e=>e.distance>0)).toBe(true);
 const restored=restore(serialize(g));expect(restored.liveStrengthCache).toEqual(cache);
 restored.liveStrengthCache.entries[0].speed=-1;expect(()=>restore(serialize(restored))).toThrow(/strength cache/);
});
test('native putting is driven by the browser game loop through the visible round result',async({page})=>{
 const g=course();startPractice(g);const cup=g.holes[0].green;
 g.pro.ball={x:cup.x-1,z:cup.z};g.pro.pos={...g.pro.ball};g.rng=1234;takeShot(g,g.pro,cup);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 await page.goto('/?start=0');await page.locator('#loading').waitFor({state:'hidden'});
 await expect.poll(()=>page.evaluate(()=>window.__gameTest.getState().pro.phase)).toBe('finished');
 const state=await page.evaluate(()=>window.__gameTest.getState());
 expect(state.pro.scorecard).toHaveLength(1);expect(state.liveStrengthCache.entries.some(e=>e.distance>0)).toBe(true);
 await page.locator('#scorecard').click();await expect(page.locator('#score-content')).toContainText(String(state.pro.totalStrokes));
 expect(errors).toEqual([]);
});
