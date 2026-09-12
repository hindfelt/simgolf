import {test,expect} from '@playwright/test';
import {happinessSummary} from '../src/ui/happiness-summary.js';
test('describes saved reactions without inventing views, deltas or starting balances',()=>{
 const v={happiness:0,happinessReactions:['weed:1','weed:2','weed:2','flowers:hole-1','steep-path:hole-1','service:driving-range:hole-1']};
 const before=JSON.stringify(v);
 const result=happinessSummary(v);
 expect(result).toContain('Enjoyed: flowerbeds, driving practice.');
 expect(result).toContain('Disliked: dandelions (2), steep uphill paths.');
 expect(result).not.toContain('-2');
 expect(JSON.stringify(v)).toBe(before);
 expect(happinessSummary({})).toContain('No happiness reactions');
});
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {update,serialize} from '../src/simulation/game.js';
test('golfer panel displays experiences after save reload on a phone',async({page})=>{
 const g=createPlaytestCourse();g.nextHelicopter=10000;
 for(let i=0;i<200&&!g.guests.length;i++)update(g,.1);
 expect(g.guests.length).toBeGreaterThan(0);
 g.guests[0].happinessReactions.push('flowers:hole-1','steep-path:hole-1');
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(save=>localStorage.setItem('simgolf-reborn.course.v1',save),serialize(g));
 await page.goto('/');
 await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('[data-mode="guests"]').click();
 await expect(page.locator('#live-details')).toContainText('Enjoyed: flowerbeds');
 await expect(page.locator('#live-details')).toContainText('Disliked: steep uphill paths');
});
