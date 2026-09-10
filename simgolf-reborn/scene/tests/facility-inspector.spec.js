import {test,expect} from '@playwright/test';
import {createGame,build,serialize} from '../src/simulation/game.js';
import {facilityDetails} from '../src/ui/facility-inspector.js';
test('helipad status explains connection and actual flight activity',()=>{
 const g=createGame();build(g,'helipad',22,14);const f=g.facilities[0];
 expect(facilityDetails(g,f).lines.join(' ')).toContain('Disconnected');
 for(let c=8;c<=22;c++)build(g,'path',c,11);
 expect(facilityDetails(g,f).lines.join(' ')).toContain('Open a hole');
 g.helicopter={padId:f.id,phase:'parked',guests:[1,2]};g.guests=[{id:1}];
 expect(facilityDetails(g,f).lines.join(' ')).toContain('Waiting for 1 golfers');
 expect(facilityDetails(g,f).lines.join(' ')).toContain('0 helicopter landings');
});
test('clicking a building in Inspect shows its connection and purpose',async({page})=>{
 const g=createGame();expect(build(g,'hotel',22,14).ok).toBe(true);
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
 await page.locator('[data-tool="inspect"]').click();
 const p=await page.evaluate(()=>window.__gameTest.project(1,-5));
 await page.mouse.click(p.x,p.y);
 await expect(page.locator('#facility-inspector')).toBeVisible();
 await expect(page.locator('#facility-inspector')).toContainText('Resort Hotel');
 await expect(page.locator('#facility-inspector')).toContainText('Disconnected');
 await expect(page.locator('#facility-inspector')).toContainText('better rested');
 await page.getByRole('button',{name:'Back to course',exact:true}).click();
 await expect(page.locator('#facility-inspector')).not.toBeVisible();
});
