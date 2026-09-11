import {test,expect} from '@playwright/test';
import {createGame,serialize} from '../src/simulation/game.js';
import {coastalPreview} from '../src/rendering/coastal-preview.js';
import {buyLand,ownedRows} from '../src/simulation/land-purchase.js';
import {GRID,key} from '../src/simulation/world.js';
import {coastColumn} from '../src/simulation/coast.js';

test('unowned coastal preview is read-only and agrees with the next purchased parcel',()=>{
 const game=createGame(1234,'coast','links'),before=serialize(game),view=coastalPreview(game);
 expect(serialize(game)).toBe(before);expect(view.landParcels).toBe(0);
 expect(view.tiles[key(44,50)]?.type).toBe('water');
 const start=ownedRows(game);expect(buyLand(game).ok).toBe(true);
 for(let r=start;r<ownedRows(game);r++)for(let c=0;c<GRID.width;c++){
  expect(game.tiles[key(c,r)]).toEqual(view.tiles[key(c,r)]);
  expect(game.elevation[key(c,r)]||0).toBe(view.elevation[key(c,r)]||0);
 }
 expect(coastalPreview(game)).not.toBe(view);
 expect(new Set(Array.from({length:100},(_,r)=>coastColumn(1234,r))).size).toBeGreaterThan(8);
});
test('coastline and rocky banks remain visible beyond the starting property',async({page})=>{
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(createGame(1234,'coast','links')));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});
 await page.screenshot({path:'/tmp/simgolf-coastal-revision.png'});
 expect(errors).toEqual([]);
 expect((await page.evaluate(()=>window.__gameTest.getState())).landParcels).toBe(0);
});
