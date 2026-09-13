// Shared arithmetic from 0x42def0's neighbor relaxation. Map dimensions and
// hard walking barriers belong to the caller; retail uses its 50x50 wavefront.
export function originalPathCost({traversalCost,diagonal,occupied,flags,currentFlags,
 direction,x,z,destination,worldFlags=0,departing=false,code,metadataClass,currentCost}) {
 let cost=traversalCost+(diagonal?1:0);
 if(occupied)cost+=2;
 if(!diagonal&&(flags&0x420)===32&&(currentFlags&32)){
  const a=x-destination.x,b=z-destination.z;
  const cardinal=Math.abs(a)>Math.abs(b)?(a>0?2:6):(b>0?4:0);
  cost=direction===cardinal?0:1;
 }
 if((worldFlags&256)||departing)cost=code===0||code===1||code===2||metadataClass===7?cost+1:(cost+1)>>1;
 if((code===17||code===20)&&!(flags&32)&&currentCost<64)cost+=16;
 return cost+currentCost;
}
