import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('two authenticated browsers share edits, reconnect and enforce spectator access against real D1',async({browser})=>{
 const [owner,editor]=JSON.parse(readFileSync('.wrangler/shared-integration/players.json','utf8'));
 async function client(player){const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'__Host-simgolfer_session',value:player.token,domain:'localhost',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);return {context,page:await context.newPage()};}
 const a=await client(owner),b=await client(editor),errors=[];a.page.setDefaultTimeout(10000);b.page.setDefaultTimeout(10000);
 a.page.on('pageerror',e=>errors.push(e.message));b.page.on('pageerror',e=>errors.push(e.message));
 try{
  await a.page.goto('http://localhost:8789/');await a.page.getByRole('button',{name:'Account',exact:true}).click();await a.page.getByText('Shared courses',{exact:true}).click();
  await a.page.getByLabel('New shared course name').fill('Two-player links');await a.page.getByRole('button',{name:'Create shared course',exact:true}).click();await expect(a.page).toHaveURL(/shared=/);await expect(a.page.locator('#shared-status')).toContainText('owner');
  const url=a.page.url();const original=await a.page.evaluate(()=>localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith('.simgolf-reborn.course.v1'))));
  await a.page.getByRole('button',{name:'Account',exact:true}).click();await a.page.getByText('Shared courses',{exact:true}).click();await a.page.getByText('Manage access',{exact:true}).click();await a.page.getByLabel('Player ID',{exact:true}).fill(editor.id);await a.page.getByRole('button',{name:'Update access',exact:true}).click();await expect(a.page.locator('#account-status')).toHaveText('Course access updated.');await a.page.getByRole('button',{name:'Close account',exact:true}).click();
  await b.page.goto(url);await expect(b.page.locator('#shared-status')).toContainText('editor');
  for(const [tool,x,z,field] of [['Tee',-29,7,'tee'],['Green',1,-13,'green']]){
   await a.page.getByRole('button',{name:tool,exact:true}).click();const point=await a.page.evaluate(({x,z})=>window.__gameTest.project(x,z),{x,z});await a.page.mouse.click(point.x,point.y);
   await expect.poll(()=>a.page.evaluate(field=>!!window.__gameTest.getState().holes[0][field],field)).toBe(true);
  }
  await a.page.getByRole('button',{name:'＋ Add hole',exact:true}).click();await expect.poll(()=>a.page.evaluate(()=>window.__gameTest.getState().holes.length)).toBe(2);await expect.poll(()=>b.page.evaluate(()=>window.__gameTest.getState().holes.length)).toBe(2);
  const beforeBench=await b.page.evaluate(()=>window.__gameTest.getState().cash);
  await b.page.getByRole('button',{name:'Bench',exact:true}).click();const point=await b.page.evaluate(()=>window.__gameTest.project(-19,-9));await b.page.mouse.click(point.x,point.y);
  await expect.poll(()=>b.page.evaluate(()=>window.__gameTest.getState().cash)).toBeLessThan(beforeBench);await expect.poll(()=>a.page.evaluate(()=>window.__gameTest.getState().cash)).toBeLessThan(beforeBench);
  await b.page.reload();await expect(b.page.locator('#shared-status')).toContainText('editor');expect(await b.page.evaluate(()=>window.__gameTest.getState().holes.length)).toBe(2);
  await a.page.getByRole('button',{name:'Account',exact:true}).click();await a.page.getByLabel('Player ID',{exact:true}).fill(editor.id);await a.page.getByLabel('Course access',{exact:true}).selectOption('spectator');await a.page.getByRole('button',{name:'Update access',exact:true}).click();await expect(a.page.locator('#account-status')).toHaveText('Course access updated.');
  await expect(b.page.locator('#shared-status')).toContainText('spectator');await b.page.getByRole('button',{name:'＋ Add hole',exact:true}).click();await expect(b.page.locator('#toast')).toContainText('spectator');expect(await b.page.evaluate(()=>window.__gameTest.getState().holes.length)).toBe(2);
  expect(await a.page.evaluate(()=>localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith('.simgolf-reborn.course.v1'))))).toBe(original);
  expect(errors).toEqual([]);
 }catch(error){console.log('Shared integration failure:',error.message);throw error;}finally{await Promise.allSettled([a.context.close(),b.context.close()]);}
});
test('shared-course lobby remains usable on a phone',async({browser})=>{
 const [owner]=JSON.parse(readFileSync('.wrangler/shared-integration/players.json','utf8'));
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies([{name:'__Host-simgolfer_session',value:owner.token,domain:'localhost',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
 const page=await context.newPage();
 try{
  await page.goto('http://localhost:8789/?testing=1');await page.getByRole('button',{name:'Account',exact:true}).click();await page.getByText('Shared courses',{exact:true}).click();await expect(page.getByLabel('New shared course name')).toBeVisible();
  expect(await page.locator('#account-dialog').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(false);
  await page.screenshot({path:'/tmp/simgolfer-shared-lobby-phone.png',fullPage:true});
  await page.getByRole('link',{name:'Two-player links · owner',exact:true}).click();await expect(page.locator('#shared-status')).toContainText('owner');expect(new URL(page.url()).searchParams.has('testing')).toBe(false);
 }finally{await context.close();}
});
