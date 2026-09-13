import {test,expect} from '@playwright/test';
import {createGame,build,startPractice,takeShot,update,serialize,restore} from '../src/simulation/game.js';
import {shotPreview} from '../src/simulation/shot-preview.js';
import {airbornePoint} from '../src/simulation/shot-motion.js';
function course(){const g=createGame();build(g,'tee',7,20);build(g,'green',22,10);startPractice(g);return g;}
test('actual straight shots use recovered velocity samples and survive midair reload',()=>{
 const g=course(),cup=g.holes[0].green;
 takeShot(g,g.pro,cup);const s=structuredClone(g.pro.shot);
 expect(s.nativeFlight.samples.length).toBeGreaterThan(10);
 expect(g.liveStrengthCache.entries.some(e=>e.verticalSpeed>0)).toBe(true);
 update(g,.05);const p=airbornePoint(s,.05/s.duration);
 expect(g.pro.ball).toEqual({x:p.x,z:p.z});expect(g.pro.ballHeight).toBe(p.lift);
 const copy=restore(serialize(g));
 for(let i=0;i<200;i++){update(g,.05);update(copy,.05);}
 expect(serialize(copy)).toBe(serialize(g));expect(g.pro.shot).toBeNull();
});
test('preview uses the recovered trajectory without advancing cache or RNG',()=>{
 const g=course(),before=serialize(g),cup=g.holes[0].green;
 const preview=shotPreview(g,cup);expect(serialize(g)).toBe(before);
 takeShot(g,g.pro,cup);
 for(let i=0;i<preview.flight.length;i++)expect(preview.flight[i]).toEqual(airbornePoint(g.pro.shot,i/64*(g.pro.shot.obstruction?.t??1)));
 expect(preview.end).toEqual(g.pro.shot.end);
});
test('older saves retain their flight and malformed new flight data is rejected',()=>{
 const old=course();delete old.liveFlightVersion;const g=restore(serialize(old));
 takeShot(g,g.pro,g.holes[0].green);expect(g.pro.shot.nativeFlight).toBeUndefined();
 const fresh=course();takeShot(fresh,fresh.pro,fresh.holes[0].green);
 fresh.pro.shot.nativeFlight.samples[1].lift=-1;
 expect(()=>restore(serialize(fresh))).toThrow(/flight/);
});

test('browser loop completes a saved recovered flight using its calculated landing',async({page})=>{
 const g=course();takeShot(g,g.pro,g.holes[0].green);
 const end=g.pro.shot.end,errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 await page.goto('/?start=0');await page.locator('#loading').waitFor({state:'hidden'});
 await expect.poll(()=>page.evaluate(()=>window.__gameTest.getState().pro.shot)).toBeNull();
 const state=await page.evaluate(()=>window.__gameTest.getState());
 expect(state.pro.ball.x).toBeCloseTo(end.x,8);expect(state.pro.ball.z).toBeCloseTo(end.z,8);
 expect(state.liveFlightVersion).toBe(2);expect(errors).toEqual([]);
});
