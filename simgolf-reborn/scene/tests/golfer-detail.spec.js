import {test,expect} from '@playwright/test';
import {golferDetailModel} from '../src/ui/golfer-detail.js';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {update,serialize} from '../src/simulation/game.js';

test('fee explanation distinguishes refunds and actual airstrip offset',()=>{
 const v={name:'Sam',holeNumbers:[1],holeIndex:0,strokes:2,phase:'walking',happiness:-2,energy:70,hunger:20,thirst:10,happinessReactions:['weed:1']};
 const before=JSON.stringify(v),refund=golferDetailModel(v,'Rough',true);
 expect(refund.feeLabel).toBe('Current refund');expect(refund.fee).toBe('$100');
 expect(refund.feeExplanation).toContain('Happiness fee $-200 + airstrip $100');
 expect(refund.experiences).toContain('dandelions');expect(JSON.stringify(v)).toBe(before);
 expect(golferDetailModel({...v,pro:true},'Rough',true).fee).toBe('$0');
});

test('preview shows saved golfer experiences and refunds on phone',async({page})=>{
 const g=createPlaytestCourse();g.nextHelicopter=10000;
 for(let i=0;i<200&&!g.guests.length;i++)update(g,.1);
 expect(g.guests.length).toBeGreaterThan(0);
 const name=g.guests[0].name;g.guests[0].happiness=-2;g.guests[0].happinessReactions.push('weed:1');
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(g));
 await page.goto('/?ui=baron');await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#pause').click();await page.locator('[data-mode="guests"]').click();
 await expect(page.locator('.golfer-detail h3')).toHaveText(name);
 await expect(page.locator('.golfer-detail h3 b')).toHaveCount(0);
 await expect(page.locator('.golfer-detail')).toContainText('Current refund');
 await expect(page.locator('.golfer-experiences')).toContainText('dandelions');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#live-details').focus();
 await page.keyboard.press('End');
 await expect.poll(()=>page.locator('#live-details').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await page.locator('.golfer-experiences').scrollIntoViewIfNeeded();
 await expect(page.locator('.golfer-experiences')).toBeInViewport();
 await page.screenshot({path:'/tmp/fairway-baron-golfer-details-phone.png'});
});
