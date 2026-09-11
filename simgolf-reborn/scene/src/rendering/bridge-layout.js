import { key, inBounds } from "../simulation/world.js";
// Exposed water edges need rails; adjoining decks and dry-bank entrances remain open.
export function bridgeEdges(g, c, r) {
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].map(([dc, dr]) => {
    const nc = c + dc,
      nr = r + dr,
      inside = inBounds(nc, nr),
      k = inside ? key(nc, nr) : null;
    const deck = inside && !!g.bridges?.[k],
      water = inside && g.tiles[k]?.type === "water";
    return { dc, dr, rail: !inside || (water && !deck), deck };
  });
}

import {GRID,center} from '../simulation/world.js';
import {ownsLand} from '../simulation/land-purchase.js';
import {courseHeight} from '../landscape.js';
const elevations=new WeakMap();
// One continuous deck per connected crossing, above both the water surface
// and the adjoining banks. Rendering and walking use the same surface height.
export function bridgeDeckHeights(g){
 const cached=elevations.get(g);if(cached?.revision===g.revision)return cached.heights;
 const heights={},remaining=new Set(Object.keys(g.bridges||{}));
 while(remaining.size){
  const first=remaining.values().next().value,component=[first];remaining.delete(first);
  let top=.4;
  for(let i=0;i<component.length;i++){
   const id=Number(component[i]),c=id%GRID.width,r=Math.floor(id/GRID.width),p=center(c,r);
   for(const dx of [-1,0,1])for(const dz of [-1,0,1])
    top=Math.max(top,courseHeight(g,p.x+dx,p.z+dz)+.18);
   for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nc=c+dc,nr=r+dr;if(!ownsLand(g,nc,nr))continue;
    const k=String(key(nc,nr));
    if(remaining.delete(k))component.push(k);
    if(!g.bridges?.[k]&&g.tiles[k]?.type!=='water'){
     const bank=center(nc,nr);top=Math.max(top,courseHeight(g,bank.x,bank.z)+.05);
    }
   }
  }
  for(const k of component)heights[k]=top;
 }
 elevations.set(g,{revision:g.revision,heights});return heights;
}

export function bridgeWalkHeight(g,pos){
 const c=Math.floor((pos.x-GRID.minX)/GRID.size),r=Math.floor((pos.z-GRID.minZ)/GRID.size),k=key(c,r);
 if(!inBounds(c,r))return null;
 const tops=bridgeDeckHeights(g);
 if(g.bridges?.[k])return tops[k]+.04;
 if(!ownsLand(g,c,r)||g.tiles[k]?.type==='water')return null;
 const p=center(c,r),bank=courseHeight(g,p.x,p.z)+.045;
 for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const neighbor=key(c+dc,r+dr);if(!g.bridges?.[neighbor])continue;
  const toward=(pos.x-p.x)*dc+(pos.z-p.z)*dr;
  if(toward>=0)return bank+(tops[neighbor]-bank)*Math.min(1,toward)+.04;
 }
 return null;
}
