import {test,expect} from '@playwright/test';
import {createGame,addHole,serialize} from '../src/simulation/game.js';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';

for(const scenario of ['empty course','two holes','unfinished additional hole']){
 test(`Course report opens for ${scenario}`,async({page})=>{
  const game=scenario==='empty course'?createGame():createPlaytestCourse();
  if(scenario==='unfinished additional hole')expect(addHole(game).ok).toBe(true);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(game));
  await page.goto('/?start=0');await page.locator('#loading').waitFor({state:'hidden'});
  await page.locator('[data-mode="reports"]').click();
  await page.locator('#course-report').click();
  await expect(page.locator('#evaluation-dialog')).toBeVisible();
  await expect(page.locator('#evaluation-content h3')).toHaveCount(game.holes.length);
  if(scenario!=='two holes')await expect(page.locator('#evaluation-content')).toContainText('Not yet built');
  await page.getByRole('button',{name:'Close course report',exact:true}).click();
  await expect(page.locator('#evaluation-dialog')).not.toBeVisible();
  await page.locator('#course-report').click();
  await expect(page.locator('#evaluation-dialog')).toBeVisible();
  expect(errors).toEqual([]);
 });
}
