import {originalRandom} from './original-rng.js';
import {originalHeading} from './original-heading.js';
import {originalRouteSegment} from './original-route-distance.js';
// 0x42c815–0x42c9ea, after post-rebound response. Effects are emitted for
// the caller; there is no audio or golfer-stat mutation hidden in this helper.
export function originalLandingDeflection({x,z,speed,heading,terrainCode,boundaryFlags,
 skillEnabled,skillMask,luck,scatterCoefficient,targetTile,seed}) {
 if(![x,z,speed,boundaryFlags].every(n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff)||
  !Number.isInteger(heading)||heading<0||heading>0xffffffff||
  ![terrainCode,scatterCoefficient].every(n=>Number.isInteger(n)&&n>=-128&&n<=127)||
  typeof skillEnabled!=='boolean'||!Number.isInteger(skillMask)||skillMask<0||skillMask>65535||
  !Number.isInteger(luck)||luck<0||luck>255)throw Error('Invalid original landing deflection.');
 const rng=originalRandom(seed),sounds=[];
 let luckAdjusted=false;
 if(terrainCode===12&&speed>256&&boundaryFlags===0) {
  const half=skillEnabled&&(skillMask&0x200)?40:80;
  heading=(heading+((half-rng.next(half*2))<<24))>>>0;
  sounds.push(6+rng.next(3));
 }
 if(speed>256&&skillEnabled&&rng.next(100)<luck&&
  originalRouteSegment({x,z},targetTile)<75&&scatterCoefficient<=0) {
  const targetHeading=originalHeading((targetTile.x*1024+512-x)|0,(targetTile.z*1024+512-z)|0);
  heading=(heading+Math.trunc(((targetHeading-heading)<<2)/5))>>>0;
  sounds.push(24);luckAdjusted=true;
 }
 return {heading,rngState:rng.state,draws:rng.draws,sounds,luckAdjusted};
}
