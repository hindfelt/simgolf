import { GRID, inBounds } from './world.js';
import { build } from './game.js';
export function validBoundaryPoints(points) {
  return Array.isArray(points) && points.length>=3 && points.length<=32 &&
    points.every(p=>p && Object.keys(p).length===2 && Number.isInteger(p.c)&&Number.isInteger(p.r)&&inBounds(p.c,p.r));
}
const cross=(a,b,p)=>(b.c-a.c)*(p.r-a.r)-(b.r-a.r)*(p.c-a.c);
export function boundaryRegionCells(points) {
  if(!validBoundaryPoints(points))throw Error('Choose 3–32 corners inside the property.');
  let area=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    if(a.c===b.c&&a.r===b.r)throw Error('Corners must be different.');
    area+=a.c*b.r-b.c*a.r;
    for(let j=i+2;j<points.length;j++){
      if(i===0&&j===points.length-1)continue;
      const c=points[j],d=points[(j+1)%points.length];
      if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0 &&
        Math.max(Math.min(a.c,b.c),Math.min(c.c,d.c))<=Math.min(Math.max(a.c,b.c),Math.max(c.c,d.c)) &&
        Math.max(Math.min(a.r,b.r),Math.min(c.r,d.r))<=Math.min(Math.max(a.r,b.r),Math.max(c.r,d.r)))throw Error('Boundary lines must not cross.');
    }
  }
  if(!area)throw Error('Outline an area, not a straight line.');
  const cells=[];
  for(let r=0;r<GRID.height;r++)for(let c=0;c<GRID.width;c++){
    const p={c,r};let inside=false,edge=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[j],b=points[i];
      if(cross(a,b,p)===0&&c>=Math.min(a.c,b.c)&&c<=Math.max(a.c,b.c)&&r>=Math.min(a.r,b.r)&&r<=Math.max(a.r,b.r))edge=true;
      if((a.r>r)!==(b.r>r)&&c<(b.c-a.c)*(r-a.r)/(b.r-a.r)+a.c)inside=!inside;
    }
    if(inside||edge)cells.push(p);
  }
  return cells;
}
export function buildBoundaryRegion(g,points,holeId) {
  let cells;try{cells=boundaryRegionCells(points);}catch(error){return {ok:false,message:error.message};}
  const probe=structuredClone(g);
  for(const p of cells){const result=build(probe,'out-of-bounds',p.c,p.r,1,holeId);if(!result.ok)return result;}
  for(const field of ['outOfBounds','cash','ledger','revision'])g[field]=probe[field];
  return {ok:true,message:`Out-of-bounds region marked: ${cells.length} tiles.`};
}
