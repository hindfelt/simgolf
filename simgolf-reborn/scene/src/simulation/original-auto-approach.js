const dx=[0,1,1,1,0,-1,-1,-1],dz=[-1,-1,0,1,1,1,0,-1];
// 0x4239f7–0x423b66: short automatic approach, before shot assessment.
// map uses original raw terrain reads and the CURRENT mutable shot classes.
// The published landing is shared planner state, not a simulated ball flight.
export function originalAutoApproach(q,map) {
 let distance=q.distance;
 const landing={x:((q.target.x<<10)+512)|0,z:((q.target.z<<10)+512)|0};
 if(q.terrainCode!==1&&distance>25){
  const facing=((((q.heading|0)>>28)+1)>>1)&7;
  const a=facing&6,b=(facing+1)&6;
  const at=(direction,sign)=>map.shotClassAt(map.terrainAt(
   q.target.x+sign*dx[direction],q.target.z+sign*dz[direction]));
  const difference=at(a,-1)+at(b,-1)-at(a,1)-at(b,1);
  if(difference>=4){
   const allowance=map.shotClassAt(q.terrainCode)<=0?6:0;
   distance=(distance+Math.min(12,Math.max(0,Math.trunc(distance/4)-allowance)))|0;
  }
  if(difference<=-4)distance=(distance-6)|0;
 }
 return {distance,landing,diagnostics:0};
}
