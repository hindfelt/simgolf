import {test,expect} from "@playwright/test";
import {createGame,build,addHole,openHole,hire,update,serialize,restore,upgradeStaff,repositionStaff} from "../src/simulation/game.js";
import {isMotivated} from "../src/simulation/rangers.js";
import {createSession} from "../src/simulation/session.js";
function course(count = 6) {
  const g = createGame();
  const layout = [
    [13, 2, 20, 2],
    [24, 2, 24, 9],
    [27, 2, 34, 2],
    [30, 2, 30, 9],
    [38, 2, 38, 9],
    [16, 4, 16, 11],
  ];
  for (const [i, [tc, tr, gc, gr]] of layout.slice(0, count).entries()) {
    if (i) expect(addHole(g).ok).toBe(true);
    expect(build(g, "tee", tc, tr, 1, g.holes[i].id).ok).toBe(true);
    expect(build(g, "green", gc, gr, 1, g.holes[i].id).ok).toBe(true);
  }
  return g;
}
test("Marshall travels to an angry visitor, ejects once and restores pursuit exactly",()=>{
 const g=course();openHole(g,g.holes[0].id);while(!g.guests.length)update(g,.05);
 const v=g.guests[0];v.pos.x+=5;v.mood=0;v.happiness=0;g.weeds=[];g.nextWeed=10000;
 hire(g,"marshall");hire(g,"marshall");update(g,.05);
 expect(v.phase).toBe("angry");expect(g.staff.filter(s=>s.marshallTarget===v.id)).toHaveLength(1);
 const copy=restore(serialize(g));
 for(let i=0;i<350&&!v.interrupted;i++){update(g,.05);update(copy,.05);}
 expect(v.interrupted).toBe(true);expect(g.interruptedRounds.find(r=>r.id===v.roundId).reason).toBe("ejected");
 expect(g.staff.reduce((n,s)=>n+(s.ejected||0),0)).toBe(1);expect(serialize(copy)).toBe(serialize(g));
});
test("Ranger promotion keeps motivation and a manual reassignment cancels pursuit",()=>{
 const g=course();openHole(g,g.holes[0].id);while(!g.guests.length)update(g,.05);
 hire(g,"ranger");const s=g.staff[0],v=g.guests[0];expect(upgradeStaff(g,s.id).ok).toBe(true);
 v.phase="address";v.path=[];v.wait=-100;v.pos={...s.pos};update(g,.05);expect(isMotivated(g,v)).toBe(true);
 v.mood=0;v.happiness=0;v.pos.x+=5;update(g,.05);expect(s.marshallTarget).toBe(v.id);
 expect(repositionStaff(g,s.id,15,17).ok).toBe(true);expect(s.marshallTarget).toBeUndefined();expect(()=>restore(serialize(g))).not.toThrow();
});
test("Marshall hiring requires six holes and permission; retries survive reload",()=>{
 expect(hire(course(5),"marshall").ok).toBe(false);
 const g=course(),session=createSession(g),owner={id:"owner",role:"owner"};
 const cmd=session.nextCommand(owner.id,"hire-marshall",{}),result=session.execute(cmd,owner);expect(result.ok).toBe(true);
 expect(createSession(restore(serialize(g))).execute(cmd,owner)).toEqual(result);
 const watcher={id:"watcher",role:"spectator"};expect(session.execute(session.nextCommand(watcher.id,"hire-marshall",{}),watcher).ok).toBe(false);
});
test("phone hires and reports Marshall work",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(save=>{if(!localStorage.getItem("simgolf-reborn.course.v1"))localStorage.setItem("simgolf-reborn.course.v1",save);},serialize(course()));
 await page.goto("/");await page.waitForFunction(()=>!!window.__gameTest);await page.locator('[data-mode="staff"]').click();await page.locator('#hire-marshall').click();
 await expect(page.locator('#live-details')).toContainText("0 golfers ejected");await expect(page.locator('#live-details')).toContainText("golfers motivated");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:"../graphics/samples/marshall-phone.png"});
 await page.reload();await page.waitForFunction(()=>!!window.__gameTest);expect(await page.evaluate(()=>window.__gameTest.getState().staff[0].role)).toBe("marshall");
});
