import {test,expect} from '@playwright/test';
test('phone control groups retain brush selection and expose land tools without overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?ui=baron');await page.locator('#loading').waitFor({state:'hidden'});
 await page.getByText('Brush & direction',{exact:true}).click();await page.locator('#brush').selectOption('3');
 await page.locator('[data-palette="landscape"]').click();await expect(page.locator('#brush')).toBeVisible();await expect(page.locator('#brush')).toHaveValue('3');
 await page.getByText('Land & boundaries',{exact:true}).click();await expect(page.locator('#buy-land')).toBeVisible();
 await page.locator('#buy-land').click();await expect(page.locator('#land-purchase')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('new-game actions remain reachable after scrolling on a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?ui=baron');await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#menu-button').click();await page.locator('#new').click();
 await page.locator('#new-dialog').evaluate(el=>el.scrollTop=el.scrollHeight);
 await expect(page.locator('#confirm-new')).toBeInViewport();await expect(page.locator('#cancel-new')).toBeInViewport();
 await page.locator('#cancel-new').click();await expect(page.locator('#new-dialog')).not.toBeVisible();
});
test('default new-game dialog uses Baron styling and updates the relief preview',async({page})=>{
 await page.goto('/?start=1');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('html')).toHaveClass(/baron-ui/);
 const preview=page.locator('#landscape-preview');await expect(preview).toHaveAttribute('data-ready','true',{timeout:30000});
 const before=await preview.getAttribute('src');
 await page.locator('#new-environment').selectOption('desert');
 await expect(preview).toHaveAttribute('data-ready','true',{timeout:30000});expect(await preview.getAttribute('src')).not.toBe(before);
 await expect(page.locator('#confirm-new')).toBeInViewport();
 await page.screenshot({path:'/tmp/fairway-new-course-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.locator('#new-dialog').evaluate(el=>el.scrollTop=el.scrollHeight);
 await expect(page.locator('#confirm-new')).toBeInViewport();
 expect(await page.locator('#new-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:'/tmp/fairway-new-course-phone.png'});
});
