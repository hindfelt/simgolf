import {test,expect} from '@playwright/test';
import {createGame,serialize} from '../src/simulation/game.js';
import {coastalPreview} from '../src/rendering/coastal-preview.js';
import {coastalBanks,exteriorCoastalBanks} from '../src/rendering/coastal-style.js';
import {GRID} from '../src/simulation/world.js';
import {coastalWater} from '../src/simulation/coast.js';
test('rocky banks extend around outside islands and mainland without duplicate interior edges or save edits',()=>{
 const g=createGame(1234,'coast','links'),saved=serialize(g),view=coastalPreview(g);
 const edges=exteriorCoastalBanks(view,GRID),interior=new Set(coastalBanks(view,GRID).map(e=>[e.c,e.r,e.dc,e.dr].join(',')));
 expect(edges.some(e=>e.r<0&&e.c<36)).toBe(true);
 expect(edges.some(e=>e.r<0&&e.c>=36)).toBe(true);
 expect(edges.some(e=>e.r>=GRID.height)).toBe(true);
 for(const e of edges){
  expect(interior.has([e.c,e.r,e.dc,e.dr].join(','))).toBe(false);
  if(e.r< -1 || e.r>GRID.height)expect(coastalWater(g.landSeed,e.c,e.r)).toBe(true);
 }
 expect(serialize(g)).toBe(saved);
 expect(exteriorCoastalBanks({...view,landscapeStyle:'river'},GRID)).toEqual([]);
});
test('coastal exterior rock rendering loads without errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(createGame(1234,'coast','links')));
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});
 await page.screenshot({path:'/tmp/simgolf-exterior-rocks.png'});expect(errors).toEqual([]);
});
