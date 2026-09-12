import {originalProjection} from './original-projection.js';
import {originalStrengthSearch} from './original-strength-search.js';
// 0x4246b2–0x4247ae: original nearby-obstacle gate. kindAt supplies
// original metadata kind, not rendered tree geometry.
export function originalLowShotGate(q,kindAt) {
 const index=(q.actorFlags&1)&&!q.explicitTarget?1:q.firstWaterIndex;
 if(!(q.skillMask&4)&&!(q.actorFlags&2))return {eligible:false,index};
 if(q.terrainCode===1||index===1)return {eligible:false,index};
 if(q.explicitTarget)return {eligible:q.mode===4,index};
 for(const radius of [128,1024]){
  const p=originalProjection(q.referenceHeading,radius);
  if(kindAt({x:(q.x+p.x)>>10,z:(q.z-p.z)>>10})===13)return {eligible:true,index};
 }
 return {eligible:false,index};
}
// 0x4247ae–0x42487d, after the gate. The intermediate speed estimate is
// overwritten by search; both original cache calls remain observable state.
export function originalLowShot({speed,strength,firstWaterIndex},cache) {
 if(!Number.isInteger(speed)||speed<0||speed>2147483647||!Number.isInteger(strength)||strength<0||strength>330||
 !Number.isInteger(firstWaterIndex)||firstWaterIndex<0||firstWaterIndex>19)throw Error('Unsupported original low-shot input.');
 const verticalSpeed=Math.max(0,Math.min(256,Math.trunc(speed/12)));
 let result=originalStrengthSearch({distance:Math.trunc(strength*3/4),verticalSpeed,mode:0},cache);
 if(firstWaterIndex!==0)result=originalStrengthSearch({distance:Math.trunc(firstWaterIndex*50/3),verticalSpeed,mode:0},result.cache);
 return {speed:result.speed,verticalSpeed,curve:0,shotType:4,cache:result.cache};
}
