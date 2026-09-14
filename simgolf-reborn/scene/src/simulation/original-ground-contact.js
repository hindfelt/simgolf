const int=n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;
// Live ground branch 0x42c27b–0x42c354, before cup capture. Terrain 10
// extends its centre strip into matching adjacent cells; the AI's centre-only
// check is insufficient here. centreFlag is the caller's existing stack local.
export function originalGroundContact({speed,terrainCode,boundaryFlags,subX,subZ,cellX,cellZ,centreFlag},terrainAt) {
 if(![speed,boundaryFlags,cellX,cellZ].every(int)||!Number.isInteger(terrainCode)||terrainCode< -128||terrainCode>127||
  ![subX,subZ].every(n=>Number.isInteger(n)&&n>=0&&n<=15)||![0,1].includes(centreFlag)||typeof terrainAt!=='function')
  throw Error('Invalid original ground contact.');
 const matching=(dx,dz)=>{
  const value=terrainAt(cellX+dx,cellZ+dz);
  if(!Number.isInteger(value)||value< -128||value>127)throw Error('Invalid original neighbor terrain.');
  return value===10;
 };
 let slow=terrainCode===17&&boundaryFlags===0;
 if(terrainCode===10) {
  if(Math.abs(8-subX)<=2) {
   if(Math.abs(8-subZ)<=2)centreFlag=1;
   if(subZ<8&&matching(0,-1))centreFlag=1;
   if(subZ>8&&matching(0,1))centreFlag=1;
  }
  if(Math.abs(8-subZ)<=2) {
   if(subX<8&&matching(-1,0))centreFlag=1;
   if(subX>8&&matching(1,0))centreFlag=1;
  }
  slow=centreFlag!==0;
 }
 return {speed:slow?Math.trunc(speed/2):speed,centreFlag};
}
// 0x42c480–0x42c523, only if the cup check did not capture the ball.
// edgeFlags is the old cell's byte at 0x5608b0. The z projection is a cosine
// which is SUBTRACTED from position; preserve that sign when choosing a wall.
export function originalGroundReflection({x,z,cellX,cellZ,heading,edgeFlags,stepX,stepCosine}) {
 if(![x,z,cellX,cellZ,stepX,stepCosine].every(int)||!Number.isInteger(heading)||heading<0||heading>0xffffffff||
  !Number.isInteger(edgeFlags)||edgeFlags<0||edgeFlags>255)throw Error('Invalid original ground reflection.');
 let reflectedX=false,reflectedZ=false;
 if((x>>10)!==cellX&&(edgeFlags&(stepX>0?4:64))) {heading=(-heading)>>>0;reflectedX=true;}
 if((z>>10)!==cellZ&&(edgeFlags&(stepCosine>0?1:16))) {heading=(0x80000000-heading)>>>0;reflectedZ=true;}
 return {heading,reflectedX,reflectedZ};
}
