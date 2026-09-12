import {test, expect} from '@playwright/test';

test('splash covers module startup and releases the playable course', async ({page}) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(/\/src\/play\.js(?:\?.*)?$/, async route => { await gate; await route.continue(); });
  await page.goto('/', {waitUntil:'commit'});
  await expect(page.locator('#boot-screen')).toBeVisible();
  await expect(page.locator('.boot-status')).toHaveText('Preparing your resort…');
  release();
  await expect(page.locator('#boot-screen')).toHaveCount(0, {timeout:30000});
  await expect(page.locator('#menu-button')).toBeVisible();
  await expect(page).toHaveTitle('Fairway Baron');
});

test('failed initialization keeps a readable phone splash and retry control', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.route(/\/src\/play\.js(?:\?.*)?$/, route => route.fulfill({contentType:'application/javascript',body:'throw new Error("Course startup unavailable");'}));
  await page.goto('/');
  await expect(page.locator('.boot-status')).toHaveText('Course startup unavailable');
  await expect(page.getByRole('button',{name:'Retry loading'})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.unroute(/\/src\/play\.js(?:\?.*)?$/);
  await page.getByRole('button',{name:'Retry loading'}).click();
  await expect(page.locator('#boot-screen')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('#menu-button')).toBeVisible();
});
