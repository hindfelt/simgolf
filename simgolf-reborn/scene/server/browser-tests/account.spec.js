import {test,expect} from '@playwright/test';
import {createGame,build,serialize} from '../../src/simulation/game.js';
const available={providers:[{id:'google',name:'Google'},{id:'apple',name:'Apple'},{id:'github',name:'GitHub'},{id:'microsoft',name:'Microsoft'},{id:'email',name:'Email code'}]};
const user={id:'player-one',name:'First Player',email:'first@proton.me',role:'player'};
const reply=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
test('sign-in is required before the game starts, even in testing mode',async({page})=>{
 await page.route('**/api/auth/me',r=>reply(r,{user:null},401));await page.route('**/api/auth/providers',r=>reply(r,available));
 await page.goto('/?testing=1');await expect(page).toHaveURL(/login.html/);await expect(page.locator('canvas')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Continue with Microsoft'})).toBeVisible();
 expect(await page.evaluate(()=>!!window.__gameTest)).toBe(false);
});
test('phone registration offers providers and email-code verification without overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});let signedIn=false;
 await page.route('**/api/auth/providers',r=>reply(r,available));await page.route('**/api/auth/me',r=>reply(r,signedIn?{user,csrf:'test',expiresAt:Date.now()+100000}:{user:null},signedIn?200:401));
 await page.route('**/api/auth/email/start',r=>reply(r,{id:'test-challenge'}));
 await page.route('**/api/auth/email/verify',r=>{expect(r.request().postDataJSON()).toEqual({id:'test-challenge',code:'12345678'});signedIn=true;return reply(r,{ok:true});});
 await page.goto('/login.html');await page.locator('#email').fill('golfer@proton.me');await page.getByRole('button',{name:'Send sign-in code'}).click();await expect(page.locator('#code-form')).toBeVisible();
 await page.screenshot({path:'/tmp/simgolfer-login-phone.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.locator('#code').fill('12345678');await page.getByRole('button',{name:'Sign in and play'}).click();await page.waitForFunction(()=>window.__gameTest);await expect(page.locator('#player-account')).toBeVisible();
});
test('accounts have separate local saves and legacy imports preserve a backup',async({page})=>{
 const mine=createGame();build(mine,'bench',12,12);const legacy=createGame();
 await page.addInitScript(({mine,legacy})=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded','yes');localStorage.setItem('simgolfer.player.player-one.simgolf-reborn.course.v1',mine);localStorage.setItem('simgolf-reborn.course.v1',legacy);},{mine:serialize(mine),legacy:serialize(legacy)});
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token',expiresAt:Date.now()+100000}));await page.route('**/api/auth/providers',r=>reply(r,available));
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('#pause').click();expect(await page.evaluate(()=>window.__gameTest.getState().cash)).toBe(mine.cash);
 await page.locator('#player-account').click();await page.getByText('Bring in an older course',{exact:true}).click();await page.locator('#account-import').click();await page.waitForFunction(()=>window.__gameTest);
 expect(await page.evaluate(()=>localStorage.getItem('simgolf-reborn.course.v1'))).toBe(serialize(legacy));
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('simgolfer.player.player-one.simgolf-reborn.course.v1.previous'))).toBe(true);
});
test('a cloud conflict is displayed and preserves the local course',async({page})=>{
 await page.addInitScript(raw=>{localStorage.setItem('simgolfer.player.player-one.simgolf-reborn.course.v1',raw);localStorage.setItem('simgolfer.player.player-one.simgolfer.cloud-revision','1');},serialize(createGame()));
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token',expiresAt:Date.now()+100000}));await page.route('**/api/auth/providers',r=>reply(r,available));
 await page.route('**/api/saves/course',r=>{expect(r.request().headers()['x-player-id']).toBe(user.id);expect(r.request().headers()['if-match']).toBe('1');return reply(r,{error:'A newer cloud save exists. Load it before saving again.'},409);});
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('#pause').click();await page.locator('#player-account').click();await page.locator('#cloud-save').click();await expect(page.locator('#account-status')).toContainText('newer cloud save');
 expect(await page.evaluate(()=>!!localStorage.getItem('simgolfer.player.player-one.simgolf-reborn.course.v1'))).toBe(true);
});
test('playtesting cloud saves use a separate slot and preserve the normal course',async({page})=>{
 const normal=serialize(createGame()),testing=createGame();build(testing,'bench',12,12);
 await page.addInitScript(({normal,testing})=>{localStorage.setItem('simgolfer.player.player-one.simgolf-reborn.course.v1',normal);localStorage.setItem('simgolfer.player.player-one.simgolf-reborn.testing.simgolf-reborn.course.v1',testing);},{normal,testing:serialize(testing)});
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token',expiresAt:Date.now()+100000}));await page.route('**/api/auth/providers',r=>reply(r,available));
 let written=false;await page.route('**/api/saves/*',r=>{expect(r.request().url()).toContain('/api/saves/testing-course');if(r.request().method()==='PUT'){expect(r.request().postDataJSON().cash).toBe(testing.cash);written=true;return reply(r,{revision:1});}return reply(r,{data:null,revision:0});});
 await page.goto('/?testing=1');await page.waitForFunction(()=>window.__gameTest);await page.locator('#pause').click();await page.locator('#player-account').click();await page.locator('#cloud-save').click();await expect(page.locator('#account-status')).toContainText('Course saved');expect(written).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('simgolfer.player.player-one.simgolf-reborn.course.v1'))).toBe(normal);
});
