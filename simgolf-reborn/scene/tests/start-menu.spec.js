import {test, expect} from '@playwright/test';
import {shouldShowStartMenu} from '../src/start-menu.js';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {serialize} from '../src/simulation/game.js';

test('hosted home shows menu without intercepting game deep links',()=>{
 expect(shouldShowStartMenu('',false)).toBe(true);
 expect(shouldShowStartMenu('',true)).toBe(false);
 expect(shouldShowStartMenu('?start=1',true)).toBe(true);
 for(const key of ['shared','tournament','event','earnings','practice','testing'])expect(shouldShowStartMenu('?'+key+'=1',false)).toBe(false);
});

test('fresh start opens new-game setup without starting the simulation behind the menu',async({page})=>{
 await page.goto('/?start=1');
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>!!window.__gameTest)).toBe(false);
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#new-dialog')).toBeVisible();
 await expect(page.locator('#boot-screen')).toHaveCount(0);
 await page.locator('#new-seed').fill('5678');
 await page.getByRole('button',{name:'Start new game',exact:true}).click();
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.__gameTest?.getState().landSeed)).toBe(5678);
});

test('saved course continues and phone menu stays within screen width',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(createPlaytestCourse()));
 await page.goto('/?start=1');
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('#menu-button')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__gameTest?.getState().holes.length)).toBe(2);
});
