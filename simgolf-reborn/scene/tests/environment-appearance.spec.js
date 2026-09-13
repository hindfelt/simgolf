import {test,expect} from '@playwright/test';
import {treeScale} from '../src/simulation/tree-scale.js';
import {compatibleGolfRuleset,PRE_LINKS_RULESET,PRE_PALMS_RULESET,RULESET_VERSION,migrateProtocol,PROTOCOL_VERSION} from '../src/simulation/protocol.js';
test('environments produce distinct actual-renderer previews for the same property',async({page})=>{
 if(!process.env.CI)test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
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

test('palm physics revisions migrate saves but retain explicit tournament boundaries',()=>{
 expect(compatibleGolfRuleset(PRE_PALMS_RULESET,'tropical','river')).toBe(false);
 expect(compatibleGolfRuleset(PRE_PALMS_RULESET,'links','river')).toBe(true);
 const p={version:84,ruleset:PRE_PALMS_RULESET,tick:10,revision:2,clients:[]};
 migrateProtocol(p);expect(p.version).toBe(PROTOCOL_VERSION);expect(p.tick).toBe(10);
});

test('new-game environment selector refreshes the rendered preview without changing the seed',async({page})=>{
 if(!process.env.CI)test.setTimeout(60000);
 await page.goto('/?start=1');
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 await page.locator('#loading').waitFor({state:'hidden'});
 await expect(page.locator('#new-dialog')).toBeVisible();
 const seed=await page.locator('#new-seed').inputValue(),views=[];
 for(const environment of ['parklands','tropical','links']){
  await page.locator('#new-environment').selectOption(environment);
  const frame=page.locator('#landscape-preview');
  await expect(frame).toHaveAttribute('data-ready','true');
  const query=new URL(await frame.getAttribute('src'),page.url()).searchParams;
  expect(query.get('environment')).toBe(environment);
  expect(query.get('landscape')).toBe(environment==='parklands'?'river':environment==='tropical'?'island':'coast');
  views.push(await page.frameLocator('#landscape-preview').locator('canvas').screenshot({path:`/tmp/baron-new-${environment}.png`}));
  expect(await page.locator('#new-seed').inputValue()).toBe(seed);
 }
 expect(views[0].equals(views[1])).toBe(false);
 expect(views[1].equals(views[2])).toBe(false);
 await expect(page.locator('#environment-summary')).toContainText('windswept');
 await page.locator('#new-landscape').selectOption('river');
 await expect(page.locator('#landscape-preview')).toHaveAttribute('data-ready','true');
 const query=new URL(await page.locator('#landscape-preview').getAttribute('src'),page.url()).searchParams;
 expect(query.get('environment')).toBe('links');expect(query.get('landscape')).toBe('river');
});
