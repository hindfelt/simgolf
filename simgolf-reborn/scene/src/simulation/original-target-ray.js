import {originalProjection} from './original-projection.js';
import {originalTargetNeighborhood} from './original-target-neighborhood.js';
import {originalRandom} from './original-rng.js';
// 0x423b66–0x423dd7. Raw map/height callbacks preserve original tile semantics.
export function originalTargetRay(q, map) {
 const span=Math.trunc(q.distance/25)|0, direction=((((q.heading|0)>>28)+1)>>1)&7;
 const totals=Array(32).fill(0), directions=Array.from(q.directions);
 const rng=originalRandom(q.seed);
 let accumulated=4-(q.actorId&3),obstacles=0,markedTerrain=0,firstWaterIndex=0;
 let dominantCode=q.dominantCode,dominantDirection=q.dominantDirection;
 let sampleX=q.sampleX,sampleZ=q.sampleZ;
 for(let i=0;i<span;i++) {
  const radius=512+i*1024,p=originalProjection(q.heading,radius);
  sampleX=((q.origin.x+p.x)|0)>>10;sampleZ=((q.origin.z-p.z)|0)>>10;
  dominantCode=sampleZ;
  if(sampleX<0||sampleX>=50||sampleZ<0||sampleZ>=50||map.terrainAt(sampleX,sampleZ)===20) break;
  const code=map.terrainAt(sampleX,sampleZ),cls=map.shotClassAt(code);
  accumulated=(accumulated+Math.imul(i,cls)*2)|0;
  totals[code]=(totals[code]+Math.imul(i+1,cls)*2)|0;directions[code]=direction^4;
  dominantDirection=i+1;
  if(code===17&&firstWaterIndex===0) firstWaterIndex=i;
  if(i!==0&&map.kindAt(code)===13) obstacles++;
  if(map.marksAt(sampleX,sampleZ)&0x100) markedTerrain=code;
  const reference=i<=Math.trunc(span/2)?q.originTile:q.target;
  const referenceHeight=map.heightAt(reference.x,reference.z);
  if(map.heightAt(sampleX,sampleZ)>((referenceHeight+1)|0)) obstacles+=2;
  const offset=rng.next(2)?0x0aaaaaaa:0xf5555556;
  const side=originalProjection((q.heading+offset)>>>0,radius);
  const sideX=((q.origin.x+side.x)|0)>>10,sideZ=((q.origin.z-side.z)|0)>>10;
  accumulated=(accumulated+Math.imul(map.shotClassAt(map.terrainAt(sideX,sideZ)),i+1))|0;
 }
 return {span,totals,directions,accumulated,obstacles,markedTerrain,firstWaterIndex,dominantCode,dominantDirection,sampleX,sampleZ,seed:rng.state,draws:rng.draws};
}

export function originalTargetAssessment(q,map) {
 const ray=originalTargetRay(q,map);
 return {...ray,...originalTargetNeighborhood({...q,...ray},map.terrainAt,map.shotClassAt)};
}
