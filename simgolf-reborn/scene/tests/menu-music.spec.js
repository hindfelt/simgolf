import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  window.musicPlayers=[];
  window.Audio=class {
   constructor(src){this.src=src;this.calls=0;this.pauses=0;this.currentTime=0;window.musicPlayers.push(this);}
   play(){this.calls++;return Promise.resolve();}
   pause(){this.pauses++;}
  };
 });
});
test('opening soundtrack continues through new-game setup and stops when it closes',async({page})=>{
 await page.goto('/?start=1');
 await expect(page.getByRole('navigation',{name:'Start game'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Turn menu music off'})).toBeVisible();
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#new-dialog .menu-music')).toBeVisible();
 await page.locator('#cancel-new').click();
 await expect(page.locator('.menu-music')).toHaveCount(0);
 expect(await page.evaluate(()=>({pauses:musicPlayers[0].pauses,time:musicPlayers[0].currentTime,loop:musicPlayers[0].loop}))).toEqual({pauses:1,time:0,loop:true});
 const calls=await page.evaluate(()=>musicPlayers[0].calls);
 await page.locator('#menu-button').click();
 expect(await page.evaluate(()=>musicPlayers[0].calls)).toBe(calls);
});
test('music preference survives reload and unmuting starts playback',async({page})=>{
 await page.goto('/?start=1');
 await page.getByRole('button',{name:'Turn menu music off'}).click();
 await page.reload();
 await expect(page.getByRole('button',{name:'Turn menu music on'})).toBeVisible();
 expect(await page.evaluate(()=>musicPlayers[0].calls)).toBe(0);
 await page.getByRole('button',{name:'Turn menu music on'}).click();
 expect(await page.evaluate(()=>musicPlayers[0].calls)).toBe(1);
});
