// Presentation only: changing the coast palette must not change lies or saves.
export const COAST_WATER = "#36576b";
export const coastWaterColor = environment => environment === "tropical" ? "#42b8ad" : COAST_WATER;

// Exposed water/land edges, excluding bridges and the artificial map boundary.
export function coastalBanks(g, grid) {
  if (g.landscapeStyle !== "coast") return [];
  const banks = [];
  const wet = (c, r) => g.tiles[r * grid.width + c]?.type === "water";
  for (const [id, t] of Object.entries(g.tiles)) {
    if (t.type !== "water" || g.bridges?.[id]) continue;
    const c = Number(id) % grid.width,
      r = Math.floor(Number(id) / grid.width);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dc,
        nr = r + dr;
      if (
        nc < 0 ||
        nc >= grid.width ||
        nr < 0 ||
        nr >= grid.height ||
        wet(nc, nr)
      )
        continue;
      if (g.bridges?.[nr * grid.width + nc]) continue;
      banks.push({ c, r, dc, dr });
    }
  }
  return banks;
}

import {coastalWater} from '../simulation/coast.js';
export const COAST_FIRST_ROW=-100;
export const COAST_LAST_ROW=150;
// Continue banks around offshore scenery and across map seams. Inside the map,
// use actual edited tiles; outside it, use the same shoreline as the ocean mesh.
export function exteriorCoastalBanks(g,grid){
 if(g.landscapeStyle!=='coast')return [];
 const inside=(c,r)=>c>=0&&c<grid.width&&r>=0&&r<grid.height;
 const wet=(c,r)=>inside(c,r)?g.tiles[r*grid.width+c]?.type==='water'
   : c>=grid.width || coastalWater(g.landSeed??2002,c,r);
 const bridge=(c,r)=>inside(c,r)&&!!g.bridges?.[r*grid.width+c];
 const banks=[];
 for(let r=COAST_FIRST_ROW;r<COAST_LAST_ROW;r++)for(let c=0;c<=grid.width;c++){
  if(!wet(c,r)||bridge(c,r))continue;
  for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nc=c+dc,nr=r+dr;
   if(nc<0||nc>=grid.width||nr<COAST_FIRST_ROW||nr>=COAST_LAST_ROW)continue;
   if(inside(c,r)&&inside(nc,nr))continue;
   if(wet(nc,nr)||bridge(nc,nr))continue;
   banks.push({c,r,dc,dr,exterior:true});
  }
 }
 return banks;
}
