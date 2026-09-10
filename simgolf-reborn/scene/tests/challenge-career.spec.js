import {test,expect} from '@playwright/test';
import {createGame,build,addHole,serialize,restore} from '../src/simulation/game.js';
import {stepChallengeCareer,challengeCareer,acceptChallenge,settleCareerChallenge,validateChallengeCareer} from '../src/simulation/challenge-career.js';
import {createSession} from '../src/simulation/session.js';
import {createProChallenge} from '../src/simulation/pro-challenge.js';
import {exportCourse} from '../src/simulation/course-package.js';
import {exportGolfer} from '../src/simulation/golfer-package.js';
import {rosterOpponent} from '../src/simulation/roster-opponent.js';
function course(){
 const g=createGame();
 g.removedTrees={};for(let c=18;c<43;c++)for(let r=0;r<15;r++)g.removedTrees[r*45+c]=true;
 for(let i=0;i<3;i++) {if(i)expect(addHole(g).ok).toBe(true);const id=g.holes[i].id;expect(build(g,'tee',22+i*8,12,1,id).ok).toBe(true);expect(build(g,'green',22+i*8,5,1,id).ok).toBe(true);}
 g.time=410;stepChallengeCareer(g);return g;
}
test('offer waits for sufficient holes, persists its professional and rejects unauthorized decisions',()=>{
 const empty=createGame();empty.time=500;stepChallengeCareer(empty);expect(challengeCareer(empty).offer).toBeNull();
 const g=course();expect(g.challengeCareer.offer.status).toBe('offered');
 expect(restore(serialize(g)).challengeCareer).toEqual(g.challengeCareer);
 const before=structuredClone(g.challengeCareer.offer);stepChallengeCareer(g);expect(g.challengeCareer.offer).toEqual(before);
 const session=createSession(g),owner={id:'owner',role:'owner'},viewer={id:'viewer',role:'spectator'};
 expect(session.execute(session.nextCommand(viewer.id,'decline-challenge',{id:before.id}),viewer).ok).toBe(false);
 const request=session.nextCommand(owner.id,'decline-challenge',{id:before.id});
 expect(session.execute(request,owner).ok).toBe(true);expect(session.execute(request,owner).ok).toBe(true);
 expect(g.challengeCareer.level).toBe(0);expect(g.challengeCareer.offer).toBeNull();
 stepChallengeCareer(g);expect(g.challengeCareer.offer).toBeNull();
 g.time+=410;stepChallengeCareer(g);expect(g.challengeCareer.offer.id).toBe(before.id+1);
 const bad=structuredClone(g);bad.challengeCareer.offer.stakes.match=1;expect(()=>validateChallengeCareer(bad)).toThrow();
});
async function completed(delayRival=false){
 const g=course(),o=g.challengeCareer.offer,pkg=await exportCourse(g);
 const host=await createProChallenge({id:'career-event',course:pkg,resident:{id:'local-owner',name:'Gary',golfer:exportGolfer(g)},challenger:{id:'club-rival',...rosterOpponent(o.professional)},stakes:o.stakes});
 expect(acceptChallenge(g,o.id,'career-event',pkg.digest).ok).toBe(true);
 expect((await settleCareerChallenge(g,host.save())).ok).toBe(false);
 for(let tick=0;tick<15000&&host.snapshot().status!=='complete';tick++){
  for(const id of ['local-owner','club-rival']){const r=host.roundSnapshot(id),p=r.pro;if(p.phase==='address') {const cup=r.holes.find(h=>h.id===p.holeId).green;host.execute(host.nextCommand(id,'shot',{x:id==='club-rival'&&delayRival&&p.strokes<10?p.ball.x+8:cup.x,z:id==='club-rival'&&delayRival&&p.strokes<10?p.ball.z:cup.z,technique:'straight'}),{id,role:'golfer'});}}
  host.stepTicks(10);
 }
 expect(host.snapshot().status).toBe('complete');return {g,host};
}
test('accepted match settles derived money once after reload and rolls ladder back on non-win',async()=>{
 const {g,host}=await completed();const loaded=restore(serialize(g)),cash=loaded.cash;
 const result=host.snapshot();const wrong=JSON.parse(host.save());wrong.stakes.perHole++;
 await expect(settleCareerChallenge(loaded,JSON.stringify(wrong))).rejects.toThrow();expect(loaded.cash).toBe(cash);
 const outcomes=await Promise.all([settleCareerChallenge(loaded,host.save()),settleCareerChallenge(loaded,host.save())]);
 expect(outcomes.filter(r=>r.ok)).toHaveLength(1);
 expect(loaded.cash).toBe(cash+result.residentNet);expect(loaded.challengeCareer.results).toHaveLength(1);
 expect(loaded.challengeCareer.level).toBe(result.matchAmount>0?1:0);
 expect(restore(serialize(loaded)).challengeCareer).toEqual(loaded.challengeCareer);
});
test('phone reviews and accepts a fixed invitation',async({page})=>{
 const g=course();await page.setViewportSize({width:390,height:844});
 await page.addInitScript(save=>{if(!localStorage.getItem('simgolf-reborn.course.v1'))localStorage.setItem('simgolf-reborn.course.v1',save)},serialize(g));
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
 await page.locator('#menu-button').click();await page.locator('#career-challenge').click();
 await expect(page.locator('#invitation-dialog')).toContainText(g.challengeCareer.offer.professional);
 await page.getByRole('button',{name:'Review and accept',exact:true}).click();
 await expect(page.locator('#championship-opponent')).toBeDisabled();
 await expect(page.locator('#challenge-match-stake')).toBeDisabled();
 await page.screenshot({path:'/tmp/simgolf-career-invitation.png'});
 await page.locator('#start-championship').click();await page.waitForURL(/championship=/);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('simgolf-reborn.course.v1')));
 expect(saved.challengeCareer.offer.status).toBe('playing');expect(saved.challengeCareer.level).toBe(1);
});
test('return to resort applies a completed event and reload cannot repeat payment',async({page})=>{
 const {g,host}=await completed();const expected=g.cash+host.snapshot().residentNet;
 await page.addInitScript(({save,event})=>{if(!localStorage.getItem('simgolf-reborn.course.v1')) {localStorage.setItem('simgolf-reborn.course.v1',save);localStorage.setItem('simgolf-reborn.championship.career-event',event)}},{save:serialize(g),event:host.save()});
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
 expect(await page.evaluate(()=>window.__gameTest.getState().cash)).toBe(expected);
 await page.reload();await page.waitForFunction(()=>window.__gameTest);
 expect(await page.evaluate(()=>window.__gameTest.getState().challengeCareer.results.length)).toBe(1);
});

test('winning retains the advanced level and requires another complete hole for the next invitation',async()=>{
 const {g,host}=await completed(true);
 expect(host.snapshot().matchAmount).toBeGreaterThan(0);
 await settleCareerChallenge(g,host.save());expect(g.challengeCareer.level).toBe(1);
 g.time+=410;stepChallengeCareer(g);expect(g.challengeCareer.offer).toBeNull();
 expect(addHole(g).ok).toBe(true);const id=g.holes.at(-1).id;
 expect(build(g,'tee',22,30,1,id).ok).toBe(true);expect(build(g,'green',35,35,1,id).ok).toBe(true);
 stepChallengeCareer(g);expect(g.challengeCareer.offer.stakes).toEqual({perHole:4000,match:8000});
});

test('a forged event digest cannot substitute another course for the accepted resort layout',async()=>{
 const {g,host}=await completed();
 // Even a forged matching event digest is insufficient: the host captured the design.
 g.challengeCareer.offer.layout={...g.challengeCareer.offer.layout,landParcels:1};
 const cash=g.cash;
 await expect(settleCareerChallenge(g,host.save())).rejects.toThrow(/does not match/);
 expect(g.cash).toBe(cash);
});
