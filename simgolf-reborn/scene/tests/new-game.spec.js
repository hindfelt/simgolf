import {test,expect} from '@playwright/test';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {serialize} from '../src/simulation/game.js';

test('new game is prominent, resets the resort and preserves a restorable backup',async({page})=>{
 await page.addInitScript(raw=>{
  if(!localStorage.getItem('simgolf-reborn.course.v1'))localStorage.setItem('simgolf-reborn.course.v1',raw);
 },serialize(createPlaytestCourse()));
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#menu-button').click();
 await expect(page.getByText('View the approved art study')).toHaveCount(0);
 await expect(page.locator('.menu-actions > :first-child')).toHaveText('New game');
 await page.getByRole('button',{name:'New game',exact:true}).click();
 await page.locator('#new-seed').fill('5678');
 await page.getByRole('button',{name:'Start new game',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.__gameTest?.getState().landSeed)).toBe(5678);
 const state=await page.evaluate(()=>window.__gameTest.getState());
 expect(state.holes).toHaveLength(1);expect(state.holes[0].tee).toBeNull();
 expect(state.cash).toBe(50000);expect(state.facilities).toHaveLength(0);
 expect(state.accomplishments).toHaveLength(0);
 await page.locator('#menu-button').click();await page.locator('#new').click();
 await page.locator('#restore-previous').click();
 await expect.poll(()=>page.evaluate(()=>window.__gameTest?.getState().holes.length)).toBe(2);
});
