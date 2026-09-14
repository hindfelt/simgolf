import {test,expect} from '@playwright/test';
import {center} from '../src/simulation/world.js';
for(const width of [390,1440])test(`course rotates without changing the course at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/?start=0');
 await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#pause').click();
 const view=()=>page.evaluate(()=>window.__gameTest.getCameraView());
 const before=await view(),state=await page.evaluate(()=>window.__gameTest.getState());
 await page.getByRole('button',{name:'Rotate course right',exact:true}).click();
 const after=await view();expect(after.position).not.toEqual(before.position);
 expect(after.target).toEqual(before.target);expect(after.zoom).toBe(before.zoom);expect(after.position[1]).toBeCloseTo(before.position[1]);
 await page.keyboard.press('q');const returned=await view();returned.position.forEach((v,i)=>expect(v).toBeCloseTo(before.position[i]));
 await page.keyboard.press('e');
 expect(await page.evaluate(()=>window.__gameTest.getState())).toEqual(state);
 await page.screenshot({path:`/tmp/course-rotation-${width}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Show whole property',exact:true}).click();
 (await view()).position.forEach((v,i)=>expect(v).toBeCloseTo(before.position[i]));
});
test('construction picking follows the rotated camera and modal shortcuts do not rotate',async({page})=>{
 await page.goto('/?start=0');await page.locator('#loading').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Rotate course right',exact:true}).click();
 await page.locator('[data-tool="tee"]').click();
 const point=center(7,20),screen=await page.evaluate(p=>window.__gameTest.project(p.x,p.z),point);
 await page.mouse.click(screen.x,screen.y);
 expect((await page.evaluate(()=>window.__gameTest.getState())).holes[0].tee).toMatchObject(point);
 await page.locator('#menu-button').click();
 const camera=await page.evaluate(()=>window.__gameTest.getCameraView());await page.keyboard.press('e');
 expect(await page.evaluate(()=>window.__gameTest.getCameraView())).toEqual(camera);
});
