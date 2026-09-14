import {test,expect} from '@playwright/test';
import {coastalContourCells} from '../src/rendering/coastal-style.js';
import {terrainContours} from '../src/rendering/terrain-outline.js';
import {coastalWater} from '../src/simulation/coast.js';
import {GRID} from '../src/simulation/world.js';
test('coastal contours cross map edges without drawing false shorelines across open sea',()=>{
 for(const seed of [2002,1234,1356996279]){
  const cells=[];for(let r=0;r<GRID.height;r++)for(let c=0;c<GRID.width;c++)if(coastalWater(seed,c,r))cells.push([c,r]);
  const before=JSON.stringify(cells),extended=coastalContourCells(cells,{landscapeStyle:'coast',landSeed:seed},GRID),contours=terrainContours(extended);
  const horizontalAt=(x,y)=>contours.some(ps=>ps.some((a,i)=>{const b=ps[(i+1)%ps.length];return a[1]===y&&b[1]===y&&x>Math.min(a[0],b[0])&&x<Math.max(a[0],b[0]);}));
  for(let c=0;c<GRID.width;c++){
   if(coastalWater(seed,c,0)&&coastalWater(seed,c,-1))expect(horizontalAt(c+.5,0)).toBe(false);
   if(coastalWater(seed,c,GRID.height-1)&&coastalWater(seed,c,GRID.height))expect(horizontalAt(c+.5,GRID.height)).toBe(false);
  }
  expect(JSON.stringify(cells)).toBe(before);expect(coastalContourCells(cells,{landscapeStyle:'river'},GRID)).toBe(cells);
 }
});
