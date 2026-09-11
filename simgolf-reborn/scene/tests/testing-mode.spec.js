import {test,expect} from '@playwright/test';
import {createGame,serialize} from '../src/simulation/game.js';

test('testing purchases and feedback are isolated from the normal resort',async({page})=>{
 const original=serialize(createGame());
 await page.goto('/');
 await page.evaluate(value=>localStorage.setItem('simgolf-reborn.course.v1',value),original);
 await page.goto('/?testing=1');
 await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#buy-land').click();
 await page.locator('#confirm-land').click();
 await expect.poll(()=>page.evaluate(()=>window.__gameTest.getState().landParcels)).toBe(1);
 await page.locator('#testing-feedback').click();
 await page.locator('#testing-observed').fill('Checking the purchased boundary.');
 await page.locator('#testing-expected').fill('A visible larger property.');
 const downloaded=page.waitForEvent('download');
 await page.locator('#testing-export').click();
 const download=await downloaded;
 const stream=await download.createReadStream();let body='';for await(const chunk of stream)body+=chunk;
 const report=JSON.parse(body);
 expect(report.observed).toBe('Checking the purchased boundary.');
 expect(report.save.landParcels).toBe(1);
 expect(report.simulation).toBe('current-preview');
 expect(await page.evaluate(()=>localStorage.getItem('simgolf-reborn.course.v1'))).toBe(original);
 await page.reload();
 await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#testing-feedback').click();
 await expect(page.locator('#testing-observed')).toHaveValue(report.observed);
 await page.locator('#testing-return').click();
 await page.locator('#loading').waitFor({state:'hidden'});
 expect(await page.evaluate(()=>window.__gameTest.getState().landParcels)).toBe(0);
 await expect(page.locator('#testing-feedback')).toHaveCount(0);
});

test('feedback form fits a phone viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?testing=1');
 await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#testing-feedback').click();
 await page.locator('#testing-expected').fill('Phone feedback');
 await page.locator('#testing-export').scrollIntoViewIfNeeded();
 const box=await page.locator('#testing-feedback-dialog').boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
 await expect(page.locator('#testing-export')).toBeVisible();
});

import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {update,restore} from '../src/simulation/game.js';
test('prepared simulation completes both holes and the helicopter visit across reload',()=>{
 let g=createPlaytestCourse();
 for(let i=0;i<600;i++)update(g,.05);
 expect(g.helicopter.phase).toBe('parked');
 const visitors=[...g.helicopter.guests];
 g=restore(serialize(g));
 for(let i=0;i<16000&&g.helicopter;i++)update(g,.05);
 expect(g.helicopter).toBeNull();
 for(const id of visitors){
  const round=g.rounds.find(r=>r.golferId===id);
  expect(round.scorecard.map(h=>h.holeId)).toEqual(['hole-1','hole-2']);
 }
 expect(g.ledger.filter(e=>e.reason==='Helicopter landing fee').map(e=>e.amount)).toEqual([200]);
});
test('prepared simulation starts through the testing panel',async({page})=>{
 await page.goto('/?testing=1');await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#testing-feedback').click();
 await page.getByText('Start a prepared simulation',{exact:true}).click();
 await page.locator('#testing-scenario').click();
 await page.waitForURL('**/?testing=1');
 await expect.poll(()=>page.evaluate(()=>window.__gameTest?.getState().holes.length)).toBe(2);
});

import {exportCourse} from '../src/simulation/course-package.js';
test('imported practice remains inside testing storage and navigation',async({page})=>{
 const pkg=await exportCourse(createPlaytestCourse());
 await page.goto('/?testing=1');await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#import-course').setInputFiles({name:'course.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pkg))});
 await page.waitForURL(url=>url.searchParams.has('practice')&&url.searchParams.get('testing')==='1');
 await page.locator('#loading').waitFor({state:'hidden'});
 await expect(page.locator('#testing-feedback')).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),`simgolf-reborn.package.${pkg.digest}`)).toBeNull();
 await page.locator('#testing-feedback').click();
 await page.locator('#testing-return').click();
 await expect(page).toHaveURL(/\/$/);
});
