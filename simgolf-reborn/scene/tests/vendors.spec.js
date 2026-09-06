import {test,expect} from '@playwright/test';
import {createGame,build,openHole,hire,update,serialize,restore,dismissStaff,repositionStaff} from '../src/simulation/game.js';
import {createSession} from '../src/simulation/session.js';
const advance=(g,n)=>{for(let i=0;i<n/.05;i++)update(g,.05);};
function course(){const g=createGame();build(g,'tee',7,20);build(g,'green',36,5);openHole(g);advance(g,1.1);g.nextArrival=10000;for(const v of g.guests)v.thirst=90;return g;}
function serving(){const g=course();hire(g,'vendor');for(let i=0;i<2000&&g.staff[0].phase!=='refreshing';i++)update(g,.05);expect(g.staff[0].phase).toBe('refreshing');return g;}
test('vendor travels and completes refreshments once with exact mid-service reload',()=>{
 const g=serving(),s=g.staff[0],v=g.guests.find(v=>v.id===s.target);expect(s.served).toBe(0);expect(v.thirst).toBeGreaterThan(50);const copy=restore(serialize(g));advance(g,2.1);advance(copy,2.1);
 expect(serialize(copy)).toBe(serialize(g));expect(s.served).toBe(1);expect(v.thirst).toBeLessThan(1);expect(v.refreshmentStaffId).toBeUndefined();expect(g.stats.services).toBe(1);expect(s.removed).toBe(0);
});
test('dismissing or repositioning a serving vendor frees the customer without completing a drink',()=>{
 for(const action of ['dismiss','move']){const g=serving(),s=g.staff[0],v=g.guests.find(v=>v.id===s.target);
 if(action==='dismiss')expect(dismissStaff(g,s.id).ok).toBe(true);else expect(repositionStaff(g,s.id,15,17).ok).toBe(true);
 expect(v.refreshmentStaffId).toBeUndefined();expect(v.thirst).toBeGreaterThan(50);expect(g.stats.services).toBe(0);expect(()=>restore(serialize(g))).not.toThrow();}
});
test('two vendors reserve different guests and duplicate hire commands do not charge twice',()=>{
 const g=course(),h=createSession(g),p={id:'owner',role:'owner'},cmd=h.nextCommand(p.id,'hire-vendor');expect(h.execute(cmd,p).ok).toBe(true);expect(h.execute(cmd,p).ok).toBe(true);expect(g.staff).toHaveLength(1);hire(g,'vendor');advance(g,.1);
 expect(new Set(g.staff.map(s=>s.target)).size).toBe(2);
});
test('phone hires and displays a Soda Vendor with the other staff controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.waitForFunction(()=>window.__gameTest);await page.locator('[data-mode="staff"]').click();await page.locator('#hire-vendor').click();
 await expect(page.locator('#staff-select option')).toContainText('Soda Vendor');await expect(page.locator('#live-details')).toContainText('0 drinks served');
 await page.screenshot({path:'../graphics/samples/soda-vendor-phone.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
