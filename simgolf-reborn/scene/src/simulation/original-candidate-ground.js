// Candidate ground branch 0x421f48–0x4220f4. Slope values and boundary
// bits must come from original map helpers, not browser terrain gradients.
export function originalCandidateGround({speed,heading,skillMask,rollCoefficient,
 forwardSlope,crossSlope,boundaryFlags,terrainCode,subX,subZ,crossedX,crossedZ,
 stepX,stepCosine,wallFlags}) {
 const int=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
 if(![speed,skillMask,forwardSlope,crossSlope,boundaryFlags,stepX,stepCosine].every(int)||
   !Number.isInteger(heading)||heading<0||heading>0xffffffff||
   !Number.isInteger(rollCoefficient)||rollCoefficient< -128||rollCoefficient>127||
   !Number.isInteger(terrainCode)||![subX,subZ].every(n=>Number.isInteger(n)&&n>=0&&n<16)||
   typeof crossedX!=='boolean'||typeof crossedZ!=='boolean'||!Number.isInteger(wallFlags)||wallFlags<0||wallFlags>255)
   throw Error('Invalid original candidate ground inputs.');
 let resistance=skillMask&4?Math.max(0,Math.min(99,(rollCoefficient-forwardSlope)|0)):rollCoefficient;
 if(resistance<2&&boundaryFlags)resistance=2;
 if(skillMask&4)heading=(heading-(crossSlope<<25))>>>0;
 speed=resistance<5?(speed-Math.trunc((speed>>resistance)/2))|0:(speed-(speed>>6)+32)|0;
 if((terrainCode===17&&!boundaryFlags)||(terrainCode===10&&Math.abs(8-subX)<=2&&Math.abs(8-subZ)<=2))speed=Math.trunc(speed/2);
 if(crossedX&&(wallFlags&(stepX>0?4:64)))heading=(-heading)>>>0;
 if(crossedZ&&(wallFlags&(stepCosine>0?1:16)))heading=(0x80000000-heading)>>>0;
 return {speed,heading,resistance};
}
