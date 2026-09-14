import {test,expect} from '@playwright/test';
import {createGame,build,startPractice,update,serialize,restore,isPutting} from '../src/simulation/game.js';
function greenStart(){
 const g=createGame();build(g,'tee',7,20);build(g,'green',22,10);startPractice(g);
 g.pro.ball={x:g.holes[0].green.x-3,z:g.holes[0].green.z};g.pro.pos={...g.pro.ball};g.rng=1234;
 return g;
}
test('automatic putting starts and completes without shot commands, including a resumed lineup',()=>{
 const g=greenStart();expect(isPutting(g,g.pro)).toBe(true);
 for(let i=0;i<8;i++)update(g,.05);expect(g.pro.strokes).toBe(0);
 const copy=restore(serialize(g));let putts=0,lastStrokes=0;
 for(let i=0;i<1200&&g.pro.phase!=='finished';i++){
   update(g,.05);update(copy,.05);
   if(g.pro.strokes>lastStrokes){expect(g.pro.shot?.putt).toBe(true);putts++;lastStrokes=g.pro.strokes;}
 }
 expect(g.pro.phase).toBe('finished');expect(putts).toBeGreaterThan(0);
 expect(serialize(copy)).toBe(serialize(g));
});
test('pro waits for a manual shot off the putting surface',()=>{
 const g=greenStart();g.pro.ball={...g.holes[0].tee};g.pro.pos={...g.pro.ball};
 expect(isPutting(g,g.pro)).toBe(false);expect(isPutting(g,null)).toBe(false);
 for(let i=0;i<100;i++)update(g,.05);expect(g.pro.strokes).toBe(0);expect(g.pro.phase).toBe('address');
});
test('browser disables shot shapes and aiming during automatic putting; clicks cannot trigger an early putt',async({page})=>{
 const g=greenStart();
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#pause').click();
 await page.locator('[data-mode="play"]').click();
 await expect(page.locator('#hint')).toContainText('Putting is automatic');
 for(const shape of ['straight','draw','fade','backspin','punch'])await expect(page.locator(`[data-shot="${shape}"]`)).toBeDisabled();
 const p=await page.evaluate(()=>window.__gameTest.project(9,-13));
 await page.mouse.move(p.x,p.y);
 expect(await page.evaluate(()=>window.__gameTest.getAimPreview())).toEqual({flight:false,target:false});
 const before=await page.evaluate(()=>window.__gameTest.getState());
 await page.mouse.click(p.x,p.y);
 expect(await page.evaluate(()=>window.__gameTest.getState())).toEqual(before);
 await expect(page.locator('#toast')).toContainText('Putting is automatic');
 await page.screenshot({path:'/tmp/simgolf-automatic-putting.png'});
});

test('manual shot controls remain usable off the green and the preview clears after swinging',async({page})=>{
 const g=greenStart();g.pro.ball={...g.holes[0].tee};g.pro.pos={...g.pro.ball};
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#pause').click();
 await page.locator('[data-mode="play"]').click();await expect(page.locator('[data-shot="draw"]')).toBeEnabled();
 const p=await page.evaluate(()=>window.__gameTest.project(-11,7));await page.mouse.move(p.x,p.y);
 expect(await page.evaluate(()=>window.__gameTest.getAimPreview())).toEqual({flight:true,target:true});
 await page.mouse.click(p.x,p.y);
 await expect.poll(()=>page.evaluate(()=>window.__gameTest.getState().pro.strokes)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>window.__gameTest.getAimPreview())).toEqual({flight:false,target:false});
});
