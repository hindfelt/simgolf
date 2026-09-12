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

test('an invitation survives the sign-in screen and opens registration without auto-joining',async({page})=>{
 const id='11111111-1111-4111-8111-111111111111',destination='/?event='+id;let signedIn=false,joins=0;
 const event={id,title:'Invitation cup',ownerId:'other-player',courseDigest:'12345678',rounds:1,capacity:2,durationHours:24,endsAt:null,status:'registration',entrants:[]};
 await page.route('**/api/auth/providers',r=>reply(r,available));await page.route('**/api/auth/me',r=>reply(r,signedIn?{user,csrf:'test',expiresAt:Date.now()+100000}:{user:null},signedIn?200:401));
 await page.route('**/api/published-courses',r=>reply(r,{courses:[]}));await page.route('**/api/tournaments',r=>reply(r,{tournaments:[{...event,entrants:0}]}));await page.route('**/api/tournaments/'+id,r=>reply(r,event));await page.route('**/api/tournaments/'+id+'/join',r=>{joins++;return reply(r,event);});
 await page.route('**/api/auth/email/start',r=>{expect(r.request().postDataJSON().returnTo).toBe(destination);return reply(r,{id:'invite-challenge'});});
 await page.route('**/api/auth/email/verify',r=>{signedIn=true;return reply(r,{ok:true,returnTo:destination});});
 await page.goto(destination);await expect(page).toHaveURL(/login.html/);expect(new URL(page.url()).searchParams.get('returnTo')).toBe(destination);
 const provider=page.getByRole('link',{name:'Continue with Google',exact:true});await expect(provider).toBeVisible();expect(new URL(await provider.getAttribute('href'),page.url()).searchParams.get('returnTo')).toBe(destination);
 await page.locator('#email').fill('invited@proton.me');await page.getByRole('button',{name:'Send sign-in code'}).click();await page.locator('#code').fill('12345678');await page.getByRole('button',{name:'Sign in and play'}).click();
 await expect(page).toHaveURL(new RegExp('event='+id));await expect(page.locator('#account-dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Join tournament',exact:true})).toBeVisible();expect(joins).toBe(0);
});

test('competition access offers spectators while cooperative courses retain editors',async({page})=>{
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token',expiresAt:Date.now()+100000}));await page.route('**/api/auth/providers',r=>reply(r,available));
 await page.route('**/api/courses',r=>reply(r,{courses:[{id:'competition-course',name:'My competition',role:'owner',earningsId:'event-one'},{id:'cooperative-course',name:'Our resort',role:'owner',earningsId:null}]}));
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('#player-account').click();await page.getByText('Shared courses',{exact:true}).click();
 const access=page.getByLabel('Course access');await expect(access).toHaveCount(2);await expect(access.nth(0).locator('option[value=editor]')).toHaveCount(0);await expect(access.nth(0).locator('option[value=spectator]')).toHaveCount(1);await expect(access.nth(1).locator('option[value=editor]')).toHaveCount(1);
});

test('earnings registration sends regional settings and shows them before joining',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const event={id:'regional-event',title:'Desert coast',status:'registration',ownerId:user.id,durationMinutes:30,capacity:8,landscape:'coast',environment:'desert',entries:[{id:user.id,name:user.name,withdrawn:false}]};let created=false;
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token',expiresAt:Date.now()+100000}));await page.route('**/api/auth/providers',r=>reply(r,available));
 await page.route('**/api/earnings-competitions',r=>{if(r.request().method()==='POST'){expect(r.request().postDataJSON()).toEqual({title:'Desert coast',durationMinutes:30,capacity:8,landscape:'coast',environment:'desert'});created=true;return reply(r,event);}return reply(r,{competitions:created?[event]:[]});});
 await page.route('**/api/earnings-competitions/regional-event',r=>reply(r,event));
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('#player-account').click();await page.getByText('Earnings competitions',{exact:true}).click();
 await page.getByLabel('Earnings competition title').fill('Desert coast');await page.getByLabel('Competition landscape').selectOption('coast');await page.getByLabel('Competition environment').selectOption('desert');await page.getByRole('button',{name:'Create earnings competition',exact:true}).click();
 await expect(page.getByText('Coastal course · bays and rolling headlands · Desert',{exact:true})).toBeVisible();expect(created).toBe(true);await page.getByText('Coastal course · bays and rolling headlands · Desert',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/simgolfer-regional-earnings-phone.png'});
});

test('published library appends older courses and retries failed pages without losing results',async({page})=>{
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token',expiresAt:Date.now()+100000}));await page.route('**/api/auth/providers',r=>reply(r,available));
 await page.route('**/api/courses',r=>reply(r,{courses:[]}));
 const course=(id,title)=>({id,title,authorName:'Author',digest:'12345678abcdef'});let attempts=0;
 await page.route('**/api/published-courses*',r=>{
  const cursor=new URL(r.request().url()).searchParams.get('cursor');
  if(!cursor)return reply(r,{courses:[course('one','Newest links')],nextCursor:'1000:next'});
  expect(cursor).toBe('1000:next');
  if(++attempts===1)return reply(r,{error:'Library temporarily unavailable'},503);
  return reply(r,{courses:[course('two','Older island')],nextCursor:null});
 });
 await page.goto('/');await page.locator('#player-account').click();await page.getByText('Shared courses',{exact:true}).click();await page.getByText('Published courses',{exact:true}).click();
 await expect(page.locator('.published-list')).toContainText('Newest links');
 await page.getByRole('button',{name:'Load more courses'}).click();await expect(page.locator('#account-status')).toContainText('temporarily unavailable');
 await expect(page.locator('.published-list')).toContainText('Newest links');
 await page.getByRole('button',{name:'Load more courses'}).click();await expect(page.locator('.published-list')).toContainText('Older island');
 await expect(page.getByRole('button',{name:'Practise this version'})).toHaveCount(2);await expect(page.getByRole('button',{name:'Load more courses'})).toBeHidden();
 await page.getByRole('button',{name:'Refresh published courses'}).click();await expect(page.getByRole('button',{name:'Practise this version'})).toHaveCount(1);await expect(page.getByRole('button',{name:'Load more courses'})).toBeVisible();
});

test('tournament picker retains an older course across refresh and submits its immutable publication',async({page})=>{
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token',expiresAt:Date.now()+100000}));await page.route('**/api/auth/providers',r=>reply(r,available));
 let created=null;
 await page.route('**/api/tournaments',r=>{if(r.request().method()==='POST')created=r.request().postDataJSON();return reply(r,{tournaments:[]});});
 await page.route('**/api/published-courses*',r=>{
  const older=new URL(r.request().url()).searchParams.has('cursor');
  return reply(r,{courses:[{id:older?'old-publication':'new-publication',title:older?'Old island':'New links',authorName:'Author',digest:'abcdef123456'}],nextCursor:older?null:'1000:older'});
 });
 await page.goto('/');await page.locator('#player-account').click();await page.getByText('Tournament registration',{exact:true}).click();
 const select=page.getByLabel('Published course',{exact:true});await expect(select).toHaveValue('new-publication');
 await page.getByRole('button',{name:'Load more published courses'}).click();await expect(select.locator('option')).toHaveCount(2);await expect(select).toHaveValue('new-publication');
 await select.selectOption('old-publication');await page.getByRole('button',{name:'Refresh tournaments'}).click();await expect(select).toHaveValue('old-publication');
 await page.getByRole('button',{name:'Load more published courses'}).click();await expect(select.locator('option')).toHaveCount(2);
 await page.getByLabel('Tournament title',{exact:true}).fill('Older course cup');await page.getByRole('button',{name:'Create registration',exact:true}).click();
 await expect.poll(()=>created?.publicationId).toBe('old-publication');await expect(page.locator('#account-status')).toHaveText('Tournament registration created.');
});

test('published version history requests only that course and selects the older publication',async({page})=>{
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token',expiresAt:Date.now()+100000}));await page.route('**/api/auth/providers',r=>reply(r,available));await page.route('**/api/courses',r=>reply(r,{courses:[]}));
 const courseId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',base={courseId,title:'Island course',authorName:'Author',createdAt:1000,designRevision:1,digest:'abcdef123456'},newer={...base,id:'newer'},older={...base,id:'older',designRevision:0,digest:'123456abcdef'};let chosen='';
 await page.route('**/api/published-courses**',r=>{
  const url=new URL(r.request().url());
  if(url.pathname.endsWith('/older')){chosen='older';return reply(r,{error:'Test stopped before loading geometry'},503);}
  if(url.searchParams.has('courseId')){expect(url.searchParams.get('courseId')).toBe(courseId);return reply(r,{courses:[newer,older],nextCursor:null});}
  return reply(r,{courses:[newer],nextCursor:null});
 });
 await page.goto('/');await page.locator('#player-account').click();await page.getByText('Shared courses',{exact:true}).click();await page.getByText('Published courses',{exact:true}).click();
 await page.getByText('Published version history',{exact:true}).click();
 const history=page.locator('details').filter({has:page.getByText('Each publication is a fixed layout.',{exact:false})}).last();
 await expect(history).toContainText('design revision 0');await expect(history).toContainText('selected publication');
 await history.getByRole('button',{name:'Practise this version'}).last().click();await expect.poll(()=>chosen).toBe('older');await expect(page.locator('#account-status')).toContainText('Test stopped before loading geometry');
});
test('sign out switches all tabs to login and preserves separate players saves',async({context,page})=>{
 let active=user;
 const first=serialize(createGame()),secondGame=createGame();build(secondGame,'bench',12,12);const second=serialize(secondGame);
 await context.addInitScript(({first,second})=>{
  if(localStorage.getItem('logout-fixture'))return;
  localStorage.setItem('logout-fixture','1');localStorage.setItem('simgolfer.player.player-one.simgolf-reborn.course.v1',first);localStorage.setItem('simgolfer.player.player-two.simgolf-reborn.course.v1',second);
 },{first,second});
 await context.route('**/api/auth/me',r=>active?reply(r,{user:active,csrf:'token'}):reply(r,{error:'Sign in'},401));
 await context.route('**/api/auth/providers',r=>reply(r,available));
 await context.route('**/api/auth/logout',r=>{expect(r.request().method()).toBe('POST');expect(r.request().headers()['x-csrf-token']).toBe('token');active=null;return reply(r,{ok:true});});
 await page.goto('/?start=1');await expect(page.locator('.start-identity')).toContainText('First Player');
 const other=await context.newPage();await other.goto('/?start=1');await expect(other.locator('#start-sign-out')).toBeVisible();
 await page.locator('#start-sign-out').click();
 await expect(page).toHaveURL(/login/);await expect(other).toHaveURL(/login/);
 expect(await page.evaluate(()=>localStorage.getItem('simgolfer.player.player-one.simgolf-reborn.course.v1'))).toBe(first);
 active={...user,id:'player-two',name:'Second Player'};
 await page.goto('/?start=1');await expect(page.locator('.start-identity')).toContainText('Second Player');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>window.__gameTest);
 expect(await page.evaluate(()=>window.__gameTest.getState().cash)).toBe(secondGame.cash);
 await page.locator('#player-account').click();await expect(page.locator('#account-logout')).toBeVisible();
 await other.close();
});
test('failed logout keeps the start menu usable and reports the error',async({page})=>{
 await page.route('**/api/auth/me',r=>reply(r,{user,csrf:'token'}));
 await page.route('**/api/auth/logout',r=>reply(r,{error:'Account server unavailable. Try again.'},503));
 await page.goto('/?start=1');await page.locator('#start-sign-out').click();
 await expect(page.locator('.boot-status')).toContainText('Account server unavailable');
 await expect(page.locator('#start-sign-out')).toBeEnabled();await expect(page.getByRole('button',{name:'New Game',exact:true})).toBeEnabled();
});
