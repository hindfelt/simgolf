import {originalBounce} from './original-bounce.js';
// Candidate contact response 0x422110–0x4221c3. Mode 0 applies boundary
// and marked-surface overrides; other modes use the terrain coefficient.
export function originalCandidateBounce({height,verticalSpeed,bounceCoefficient,
 mode,boundaryFlags,terrainFlags,subX,subZ}) {
 if(!Number.isInteger(mode)||!Number.isInteger(boundaryFlags)||
   !Number.isInteger(terrainFlags)||terrainFlags<0||terrainFlags>65535||
   ![subX,subZ].every(n=>Number.isInteger(n)&&n>=0&&n<16)||
   !Number.isInteger(bounceCoefficient)||bounceCoefficient< -128||bounceCoefficient>127)
   throw Error('Invalid original candidate bounce inputs.');
 // Original checks x in [5,11) and z >= 5; there is no z upper-bound check.
 const centre=subX>=5&&subX<11&&subZ>=5;
 let coefficient=bounceCoefficient;
 if(mode===0) {
   if(coefficient<2&&boundaryFlags)coefficient=2;
   if(centre&&(terrainFlags&0x20))coefficient=4;
 }
 return {...originalBounce({height,verticalSpeed,bounceCoefficient:coefficient,boundaryFlags:0}),coefficient,centre};
}
