import {originalRouteSegment} from './original-route-distance.js';
const directions=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
// Original landing score, 0x422c34–0x422d87 and 0x422e5a–0x422e99.
// Does not include the later imaginative follow-up shot score (0x422e9d onward).
export function originalRouteLandingScore({landing,cup,hole,skillMask,excludedClass,
 distanceDivisor,score=0,goodLandings=0,terrainAt}) {
 if(!landing||![landing.x,landing.z].every(n=>Number.isInteger(n)&&n>=0&&n<51200)||
   !cup||![cup.x,cup.z].every(n=>Number.isInteger(n)&&n>=0&&n<50)||
   !Number.isInteger(hole)||hole<0||hole>31||!Number.isInteger(skillMask)||skillMask<0||skillMask>255||
   !Number.isInteger(excludedClass)||excludedClass< -128||excludedClass>127||
   ![2,4,6].includes(distanceDivisor)||!Number.isInteger(score)||!Number.isInteger(goodLandings)||
   typeof terrainAt!=='function')throw Error('Invalid original landing score inputs.');
 const at=p=>{
   if(p.x<0||p.x>=50||p.z<0||p.z>=50)return {excluded:true,shotClass:excludedClass,flags:0};
   const t=terrainAt(p);
   if(!t||!Number.isInteger(t.code)||!Number.isInteger(t.shotClass)||t.shotClass< -128||t.shotClass>127||
     !Number.isInteger(t.flags)||t.flags<0||t.flags>65535)throw Error('Invalid original scoring terrain.');
   return {...t,excluded:t.code===20};
 };
 if(skillMask&4)directions.forEach(([x,z],i)=>{
   const divisor=i%2?4:3;
   const t=at({x:(landing.x+Math.trunc(x*1024/divisor))>>10,z:(landing.z+Math.trunc(z*1024/divisor))>>10});
   score+=t.excluded?excludedClass:t.shotClass-((t.flags&0x80)?1:0);
 });
 const t=at({x:landing.x>>10,z:landing.z>>10});
 let lie=t.shotClass;
 if(t.excluded||(t.flags&0x400))lie=excludedClass;
 else if(t.flags&0x80)lie+=(t.flags&31)===hole?-1:2;
 if(t.shotClass<=0)goodLandings++;
 const remaining=originalRouteSegment(landing,cup);
 score+=Math.trunc(remaining/distanceDivisor)+lie*8;
 return {score,goodLandings,lie,remaining};
}
