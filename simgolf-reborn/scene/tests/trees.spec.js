import {test,expect} from '@playwright/test';
import {createGame,build,startPractice,takeShot,update,serialize,restore} from '../src/simulation/game.js';
import {treeCollision} from '../src/simulation/trees.js';
import {key} from '../src/simulation/world.js';
import {exportCourse,coursePractice} from '../src/simulation/course-package.js';
test('canopy catches a normal flight while high, low and curved shots can clear it',()=>{
 const g=createGame();g.tiles[key(26,17)]={type:'tree'};
 const s={from:{x:0,z:0},landing:{x:20,z:0},apex:5,curve:0,putt:false};
 expect(treeCollision(g,s)).not.toBeNull();expect(treeCollision(g,{...s,apex:12})).toBeNull();expect(treeCollision(g,{...s,apex:1})).toBeNull();expect(treeCollision(g,{...s,curve:5})).toBeNull();
});
test('a planted tree changes the actual ball path, drops to ground and survives reload',()=>{
 const g=createGame();build(g,'tee',7,20);build(g,'green',36,5);expect(build(g,'tree',12,20).ok).toBe(true);startPractice(g);
 expect(takeShot(g,g.pro,{x:-9,z:7}).ok).toBe(true);const hit=g.pro.shot.obstruction;expect(hit).toBeTruthy();
 for(let i=0;i<15;i++)update(g,.05);const copy=restore(serialize(g));for(let i=0;i<40;i++){update(g,.05);update(copy,.05);}
 expect(serialize(copy)).toBe(serialize(g));expect(g.pro.shot).toBeNull();expect(g.pro.ballHeight).toBe(0);expect(g.pro.ball.x).toBeCloseTo(hit.point.x);expect(g.pro.strokes).toBe(1);
});
test('trees are protected from tee overlap, removable and included in shared layouts',async()=>{
 const g=createGame();build(g,'tee',7,20);build(g,'green',36,5);expect(build(g,'tree',7,20).ok).toBe(false);expect(build(g,'tree',12,20).ok).toBe(true);
 const pkg=await exportCourse(g);expect(coursePractice(pkg).tiles[key(12,20)].type).toBe('tree');expect(build(g,'rough',12,20).ok).toBe(true);expect(g.tiles[key(12,20)]).toBeUndefined();
});
test('browser plants a grove and preserves it after reload',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('#pause').click();await page.locator('[data-tool="tree"]').click();await expect(page.locator('[data-tool="tree"]')).toContainText("Tree");
 for(const [x,z] of [[-19,7],[-11,7],[-3,7],[5,7]]){const p=await page.evaluate(([x,z])=>window.__gameTest.project(x,z),[x,z]);await page.mouse.click(p.x,p.y);}
 expect(await page.evaluate(()=>Object.values(window.__gameTest.getState().tiles).filter(t=>t.type==='tree').length)).toBe(4);
 await page.screenshot({path:'../graphics/samples/planted-trees.png'});await page.reload();await page.waitForFunction(()=>window.__gameTest);expect(await page.evaluate(()=>Object.values(window.__gameTest.getState().tiles).filter(t=>t.type==='tree').length)).toBe(4);
});
