import {originalRandom} from './original-rng.js';
const int=n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;
// Live post-rebound block 0x42c648–0x42c815. Call only after a landing,
// not on ordinary rolling ticks. Later luck/rock/effect checks are separate.
export function originalImpactResponse({speed,heading,verticalSpeed,stateFlags,direction,
 scatterCoefficient,currentTerrainCode,boundaryFlags,seed},slopeAt) {
 if(![speed,verticalSpeed,boundaryFlags].every(int)||verticalSpeed<0||verticalSpeed>9999||
  ![heading,stateFlags].every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff)||
  !Number.isInteger(direction)||direction<0||direction>7||
  !Number.isInteger(scatterCoefficient)||scatterCoefficient< -128||scatterCoefficient>127||
  !Number.isInteger(currentTerrainCode)||currentTerrainCode< -128||currentTerrainCode>127||typeof slopeAt!=='function')
  throw Error('Invalid original impact response.');
 const slope=d=>{const v=slopeAt(d);if(!int(v))throw Error('Invalid original impact slope.');return v;};
 const rng=originalRandom(seed);
 if(stateFlags&0x100){heading=(heading^0x80000000)>>>0;stateFlags=(stateFlags&~0x100)>>>0;}
 if(stateFlags&0x80){speed=Math.trunc(speed/2);stateFlags=((stateFlags&~0x80)|0x100)>>>0;}
 const crossDirection=((((heading>>29)+1)&~1)+2)&7;
 heading=(heading-Math.imul(slope(crossDirection),Math.imul(verticalSpeed,0xaec33)))>>>0;
 const clamp=v=>Math.max(-2,Math.min(2,v));
 speed=(speed-(Math.imul(clamp(slope(direction)),verticalSpeed)<<1))|0;
 verticalSpeed=(verticalSpeed+Math.trunc(Math.imul(clamp(slope(direction)),verticalSpeed)/2))|0;
 if(scatterCoefficient>0){
  const coefficient=Math.max(1,Math.min(3,scatterCoefficient));
  const bound=(coefficient*0x1111*10)&65535;
  const offset=Math.trunc(Math.imul(coefficient,0x0aaaaaaa)/2);
  heading=(heading+rng.next(bound)-offset)>>>0;
 }
 const stoppedByTerrain=currentTerrainCode===17&&boundaryFlags===0;
 if(stoppedByTerrain)speed=verticalSpeed=0;
 return {speed,heading,verticalSpeed,stateFlags,rngState:rng.state,draws:rng.draws,stoppedByTerrain};
}
