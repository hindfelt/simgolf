import {originalStrengthSearch} from './original-strength-search.js';
// 0x424c46–0x424cc3, with non-putters entering at 0x424c7c after their
// scenery sampling. This is an intermediate state, before remarks and launch.
// elevationCounter is actor byte +0x1b; retain byte wrap rather than saturation.
export function originalAutoLaunchGround(q,cache,map) {
 let speed=q.speed,nextCache=cache;
 if(q.club===13&&map.terrainAt(q.target.x,q.target.z)===1){
  const strength=originalStrengthSearch({distance:(q.distance+2)|0,
   verticalSpeed:0,mode:1,rollCoefficient:q.rollCoefficient},cache);
  speed=strength.speed;nextCache=strength.cache;
 }
 const targetHeight=map.heightAt(q.target.x,q.target.z);
 const originHeight=map.heightAt(q.origin.x,q.origin.z);
 const elevationCounter=(q.elevationCounter+Math.abs((originHeight-targetHeight)|0))&255;
 return {speed,cache:nextCache,elevationCounter};
}
