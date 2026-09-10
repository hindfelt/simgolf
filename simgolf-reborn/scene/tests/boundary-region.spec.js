import {test,expect} from '@playwright/test';
import {createGame,serialize,restore,build} from '../src/simulation/game.js';
import {boundaryRegionCells,buildBoundaryRegion} from '../src/simulation/boundary-region.js';
import {createSession} from '../src/simulation/session.js';
import {isOut} from '../src/simulation/landforming.js';
import {center} from '../src/simulation/world.js';
const points=[{c:20,r:12},{c:24,r:12},{c:24,r:16},{c:20,r:16}];
test('closed corners exclude their interior, persist, and charge exactly once',()=>{
 const g=createGame(),host=createSession(g),owner={id:'owner',role:'owner'};
 const cmd=host.nextCommand(owner.id,'build-boundary-region',{points,holeId:'hole-1'});
 const cash=g.cash;expect(host.execute(cmd,owner).ok).toBe(true);
 expect(host.execute(cmd,owner).ok).toBe(true);expect(g.cash).toBe(cash-125);
 expect(isOut(restore(serialize(g)),center(22,14))).toBe(true);
 expect(isOut(g,center(19,14))).toBe(false);
});
test('invalid outlines and protected cells reject atomically',()=>{
 expect(()=>boundaryRegionCells([points[0],points[2],points[1],points[3]])).toThrow();
 const g=createGame();build(g,'green',22,14);const before=serialize(g);
 expect(buildBoundaryRegion(g,points,'hole-1').ok).toBe(false);expect(serialize(g)).toBe(before);
 const poor=createGame();poor.cash=0;const saved=serialize(poor);
 expect(buildBoundaryRegion(poor,points,'hole-1').ok).toBe(false);expect(serialize(poor)).toBe(saved);
});
test('browser outlines and finishes a region',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('#pause').click();
 await page.locator('#boundary-outline').click();
 for(const c of points){const p=await page.evaluate(({c,r})=>window.__gameTest.project(-44+(c+.5)*2,-34+(r+.5)*2),c);await page.mouse.click(p.x,p.y);}
 await page.locator('#finish-boundary').click();
 await expect(page.locator('#toast')).toContainText('region marked: 25 tiles');
 expect(await page.evaluate(()=>Object.keys(window.__gameTest.getState().outOfBounds).length)).toBe(25);
});

test('regions travel with shared courses and cannot be changed by spectators',async()=>{
 const {exportCourse,coursePractice}=await import('../src/simulation/course-package.js');
 const g=createGame();build(g,'tee',7,20);build(g,'green',36,5);
 const host=createSession(g),watcher={id:'watcher',role:'spectator'};
 expect(host.execute(host.nextCommand(watcher.id,'build-boundary-region',{points,holeId:'hole-1'}),watcher).ok).toBe(false);
 expect(buildBoundaryRegion(g,points,'hole-1').ok).toBe(true);
 const shared=coursePractice(await exportCourse(g));
 expect(isOut(shared,center(22,14))).toBe(true);
 const locked=createSession(shared,{courseLocked:true}),owner={id:'owner',role:'owner'};
 expect(locked.execute(locked.nextCommand(owner.id,'build-boundary-region',{points,holeId:'hole-1'}),owner).ok).toBe(false);
});
