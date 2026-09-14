import {originalStrengthSearch} from './original-strength-search.js';
// 0x424882–0x424988: alternate branch after low-shot selection fails.
// Uses original terrain shot class and target terrain, not browser labels.
export function originalApproachShot(q,cache) {
 const {skillMask,curve,terrainCode,shotClass,club,strength,explicitTarget,mode,targetTerrainCode,
  speed,verticalSpeed,angularOffset,actorFlags,modifier,backspinValue}=q;
 if(![skillMask,curve,terrainCode,shotClass,club,strength,mode,targetTerrainCode,speed,verticalSpeed,angularOffset,actorFlags,modifier,backspinValue].every(Number.isInteger)||
 strength<0||strength>330||verticalSpeed<0||verticalSpeed>10000||angularOffset< -2147483648||angularOffset>2147483647||
 backspinValue<0||backspinValue>255||typeof explicitTarget!=='boolean')throw Error('Invalid original approach-shot inputs.');
 const eligible=!!(skillMask&4)&&curve===0&&terrainCode!==1&&shotClass===0&&club>=4&&strength>25&&
  (explicitTarget?mode===3:targetTerrainCode===1);
 if(!eligible)return {speed,verticalSpeed,angularOffset,actorFlags:actorFlags>>>0,modifier,shotType:0,cache};
 const lift=(verticalSpeed+Math.trunc(Math.imul(strength+50,verticalSpeed)/400))|0;
 const result=originalStrengthSearch({distance:strength,verticalSpeed:lift,mode:0},cache);
 return {speed:result.speed,verticalSpeed:lift,angularOffset:Math.trunc(Math.imul(angularOffset,6)/(backspinValue+3)),
  actorFlags:(actorFlags|0x80)>>>0,modifier:modifier+backspinValue,shotType:3,cache:result.cache};
}
