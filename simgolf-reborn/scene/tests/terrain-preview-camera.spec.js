import {test,expect} from '@playwright/test';

test('property camera changes the rendered view and resets without changing terrain settings',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:630,height:450});
 await page.goto('/terrain-preview.html?seed=45834163&landscape=river&environment=parklands');
 await expect(page.locator('#status')).toHaveCount(0);
 await page.getByRole('button',{name:'Reset view',exact:true}).click();
 const canvas=page.locator('canvas'),original=await canvas.screenshot();
 await page.getByRole('button',{name:'Rotate right',exact:true}).click();
 expect((await canvas.screenshot()).equals(original)).toBe(false);
 await page.getByRole('button',{name:'Reset view',exact:true}).click();
 expect((await canvas.screenshot()).equals(original)).toBe(true);
 for(let n=0;n<4;n++)await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toBeDisabled();
 expect((await canvas.screenshot()).equals(original)).toBe(false);
 await page.getByRole('button',{name:'Reset view',exact:true}).click();
 expect((await canvas.screenshot()).equals(original)).toBe(true);
 await page.setViewportSize({width:320,height:360});
 await expect(page.getByRole('button',{name:'Reset view',exact:true})).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(new URL(page.url()).searchParams.get('seed')).toBe('45834163');
 expect(errors).toEqual([]);
});
