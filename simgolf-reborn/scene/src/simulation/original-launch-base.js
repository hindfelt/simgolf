import {originalShotClub} from './original-shot-club.js';
import {originalStrengthSearch} from './original-strength-search.js';
// 0x423f48–0x424083: club selection followed by initial velocity construction.
// This precedes accuracy, random variation and special shot/putt adjustments.
export function originalLaunchBase(input,cache) {
 const {strength,club}=originalShotClub(input);
 const scaled=Math.trunc(strength*20/25);
 const estimate=scaled*33-Math.trunc(scaled*scaled/48)+64;
 const verticalSpeed=Math.trunc(estimate/8)+512;
 const result=originalStrengthSearch({distance:Math.trunc(strength*4/5),verticalSpeed,mode:0},cache);
 return {strength,club,speed:result.speed,verticalSpeed,cache:result.cache};
}
