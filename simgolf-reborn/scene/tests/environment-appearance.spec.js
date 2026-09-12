import {test,expect} from '@playwright/test';
import {treeScale} from '../src/simulation/tree-scale.js';
import {compatibleGolfRuleset,PRE_LINKS_RULESET,RULESET_VERSION} from '../src/simulation/protocol.js';
test('environments produce distinct actual-renderer previews for the same property',async({page})=>{
 test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:940,height:660});const views=[];
 for(const environment of ['parklands','tropical','links']){
  await page.goto(`/terrain-preview.html?seed=1356996279&landscape=river&environment=${environment}`);
  await expect(page.locator('#status')).toHaveCount(0);
  views.push(await page.locator('canvas').screenshot({path:`/tmp/baron-${environment}.png`}));
 }
 expect(views[0].equals(views[1])).toBe(false);expect(views[0].equals(views[2])).toBe(false);expect(views[1].equals(views[2])).toBe(false);expect(errors).toEqual([]);
});
test('links shrubs use matching collision scale and old links replays cannot change silently',()=>{
 expect(treeScale('links',20,30)).toBeLessThan(.3);expect(treeScale('links',20,30,true)).toBe(.22);
 expect(compatibleGolfRuleset(PRE_LINKS_RULESET,'links','river')).toBe(false);
 expect(compatibleGolfRuleset(PRE_LINKS_RULESET,'parklands','river')).toBe(true);
 expect(compatibleGolfRuleset(RULESET_VERSION,'links','river')).toBe(true);
});
