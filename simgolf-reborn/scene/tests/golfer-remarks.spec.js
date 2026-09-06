import {test,expect} from '@playwright/test';
import {createGame,build,startPractice,update,serialize,restore,hire} from '../src/simulation/game.js';
function neglected(){
 const g=createGame();build(g,'tee',7,20);build(g,'green',36,5);startPractice(g);
 g.weeds=[{id:g.nextId++,c:6,r:20,x:-31,z:7}];g.weedRevision++;g.nextWeed=10000;
 return g;
}
test('dandelion reaction happens once, survives reload and cleanup removes the patch',()=>{
 const g=neglected(),initial=g.pro.mood,patch=g.weeds[0].id;
 update(g,.05);expect(g.pro.mood).toBe(initial-2);expect(g.pro.comment).toContain('Dandelions');
 const resumed=restore(serialize(g));
 for(let i=0;i<20;i++)update(resumed,.05);
 expect(resumed.pro.mood).toBe(initial-2);
 expect(hire(resumed).ok).toBe(true);
 for(let i=0;i<1200&&resumed.weeds.some(w=>w.id===patch);i++)update(resumed,.05);
 expect(resumed.weeds.some(w=>w.id===patch)).toBe(false);
 expect(resumed.pro.seenWeeds.filter(id=>id===patch)).toHaveLength(1);
});
test('actual golfer complaint appears above the course then expires without blocking input',async({page})=>{
 const g=neglected();update(g,.05);
 await page.goto('/');
 await page.evaluate(save=>localStorage.setItem('simgolf-reborn.course.v1',save),serialize(g));
 await page.reload();await page.waitForFunction(()=>!!window.__gameTest);
 const remark=page.locator('.golfer-remark').filter({hasText:'Dandelions'});
 await expect(remark).toBeVisible();
 await expect(remark).toContainText('Gary Golf');
 expect(await page.locator('.golfer-remarks').evaluate(e=>getComputedStyle(e).pointerEvents)).toBe('none');
 await page.screenshot({path:'../graphics/samples/dandelion-remark.png'});
 await expect(remark).toBeHidden({timeout:10000});
});
