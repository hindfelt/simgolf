// Original planner 0x423dd7–0x423ee1. Inputs carry the preceding ray scan.
const dx=[0,1,1,1,0,-1,-1,-1], dz=[-1,-1,0,1,1,1,0,-1];
export function originalTargetNeighborhood(q, terrainAt, shotClassAt) {
  const totals=Array.from(q.totals), directions=Array.from(q.directions);
  let accumulated=q.accumulated|0;
  for(let d=0;d<8;d++) {
    const x=(q.target.x+dx[d])|0,z=(q.target.z+dz[d])|0;
    const code=x<0||x>=50||z<0||z>=50?20:terrainAt(x,z);
    if(code===20) { accumulated=(accumulated+Math.imul(q.span,4)+4)|0; continue; }
    const value=Math.trunc(Math.imul(shotClassAt(code),(q.span+1)|0)/2);
    accumulated=(accumulated+value)|0;
    totals[code]=(totals[code]+value)|0; directions[code]=d;
  }
  let best=-1, dominantCode=q.dominantCode, dominantDirection=q.dominantDirection;
  for(let i=0;i<32;i++) if(totals[i]>best) {
    best=totals[i]; dominantCode=i; dominantDirection=directions[i];
  }
  let rating=Math.trunc(accumulated/((q.span+3)|0));
  if(q.obstacles>=2) rating=(rating+4)|0;
  if(terrainAt(q.origin.x>>10,q.origin.z>>10)===1) rating=0;
  if(q.distance<=40&&rating>10) rating=10;
  return {totals,directions,dominantCode,dominantDirection,rating:rating&255};
}
