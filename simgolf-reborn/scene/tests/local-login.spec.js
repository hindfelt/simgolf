import {test,expect} from '@playwright/test';
test('local login offers the offline preview without an account backend',async({page})=>{
 const requests=[];page.on('request',r=>{if(r.url().includes('/api/auth/'))requests.push(r.url());});
 await page.goto('/login.html');
 await expect(page.getByRole('heading',{name:'Local game preview'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Sign in to the online game'})).toHaveAttribute('href','https://simgolfer.0x4d.in/');
 await page.getByRole('link',{name:'Open local preview'}).click();
 await expect(page.getByRole('navigation',{name:'Start game'})).toBeVisible();
 expect(requests).toEqual([]);
});
