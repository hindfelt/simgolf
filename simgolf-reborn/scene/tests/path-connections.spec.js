import {test,expect} from '@playwright/test';
import {createGame,build,connected,connectedPathCells,restore,serialize} from '../src/simulation/game.js';
import {key} from '../src/simulation/world.js';
test('a detached branch becomes connected as a whole and disconnects when its link is removed',()=>{
 const g=createGame();for(let c=9;c<=14;c++)expect(build(g,'path',c,14).ok).toBe(true);
 expect(connectedPathCells(g).has(key(14,14))).toBe(false);expect(build(g,'path',8,14).ok).toBe(true);expect(connectedPathCells(g).has(key(14,14))).toBe(true);
 expect(build(g,'rough',8,14).ok).toBe(true);expect(connectedPathCells(g).has(key(14,14))).toBe(false);expect([...connectedPathCells(restore(serialize(g)))]).toEqual([...connectedPathCells(g)]);
});
test('diagonal contact is not a connection and a missing clubhouse entry closes the network',()=>{
 const g=createGame();build(g,'path',8,15);expect(connectedPathCells(g).has(key(8,15))).toBe(false);build(g,'path',8,14);expect(connectedPathCells(g).has(key(8,15))).toBe(true);
 build(g,'rough',7,10);expect(connectedPathCells(g).size).toBe(0);
});
test('bridge carries a joined network to the far-bank approach and facility access uses the same network',()=>{
 const g=createGame();expect(connectedPathCells(g).has(key(18,33))).toBe(false);
 for(let r=15;r<=24;r++)expect(build(g,'path',7,r).ok).toBe(true);
 for(let c=8;c<=17;c++)expect(build(g,'path',c,24).ok).toBe(true);
 expect(connectedPathCells(g).has(key(18,33))).toBe(true);expect(build(g,'bench',19,33).ok).toBe(true);expect(connected(g,g.facilities[0])).toBe(true);
 build(g,'rough',7,16);expect(connected(g,g.facilities[0])).toBe(false);
});
test('browser shows detached and joined paths while retaining rounded edges',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('#pause').click();await page.locator('[data-tool="path"]').click();
 const paint=async(x,z)=>{const p=await page.evaluate(([x,z])=>window.__gameTest.project(x,z),[x,z]);await page.mouse.click(p.x,p.y);};
 for(const x of [-25,-23,-21,-19,-17,-15])await paint(x,-5);
 await page.screenshot({path:'../graphics/samples/paths-disconnected.png'});
 await paint(-27,-5);await page.screenshot({path:'../graphics/samples/paths-connected.png'});
 const state=await page.evaluate(()=>window.__gameTest.getState());expect(connectedPathCells(state).has(key(14,14))).toBe(true);
 await expect(page.locator('#hint')).toContainText('Disconnected sections appear muddy');
});
