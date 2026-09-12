import {test,expect} from '@playwright/test';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {update,serialize,restore} from '../src/simulation/game.js';

test('two-hole visitor round resumes mid-shot identically and displays its completed scorecard on phone',async({page})=>{
 const game=createPlaytestCourse();
 let visitor;
 for(let i=0;i<12000;i++){
  update(game,.05);visitor=game.guests.find(v=>!v.pro&&v.phase==='shot'&&v.ballHeight>0);
  if(visitor)break;
 }
 expect(visitor,'a visitor must actually hit an airborne shot').toBeTruthy();
 const id=visitor.roundId,copy=restore(serialize(game));
 for(let i=0;i<24000&&!game.rounds.some(r=>r.id===id);i++){update(game,.05);update(copy,.05);}
 const round=game.rounds.find(r=>r.id===id);
 expect(round,'visitor must finish the full itinerary').toBeTruthy();
 expect(round.scorecard.map(s=>s.holeId)).toEqual(['hole-1','hole-2']);
 expect(round.totalStrokes).toBe(round.scorecard.reduce((n,s)=>n+s.strokes,0));
 expect(new Set(round.scorecard.map(s=>s.holeId)).size).toBe(2);
 expect(round.scorecard.every(s=>Number.isFinite(s.fee)&&s.completedAt>0)).toBe(true);
 expect(serialize(copy)).toBe(serialize(game));
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(save=>localStorage.setItem('simgolf-reborn.course.v1',save),serialize(game));
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#pause').click();await page.locator('#scorecard').click();
 const heading=page.locator('#score-content h3').filter({hasText:`${round.name} · ${round.totalStrokes} strokes`}).first();
 await expect(heading).toBeVisible();
 const table=heading.locator('xpath=following-sibling::table[1]');
 await expect(table.locator('tr')).toHaveCount(3);
 for(let i=0;i<2;i++){const cells=table.locator('tr').nth(i+1).locator('td');await expect(cells.nth(2)).toHaveText(String(round.scorecard[i].strokes));await expect(cells.nth(3)).toContainText(`$${round.scorecard[i].fee}`);}
});
