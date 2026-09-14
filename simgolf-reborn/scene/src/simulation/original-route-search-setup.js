import {originalHeading} from './original-heading.js';
// 0x42252c–0x422688: normalize search mode/available curves and aim at the cup.
// nextRange receives the temporarily incremented unsigned shot counter.
export function originalRouteSearchSetup(q,nextRange) {
 let mode=q.mode;
 if(mode===0&&!(q.actorFlags&1)&&!(q.shotClass>0&&q.actorClass!==0))mode=1;
 let curveMask=q.shotClass<=0&&(q.skillMask&4)?3:0;
 if(q.actorClass!==0){if(!(q.abilityFlags&0x20))curveMask&=~1;if(!(q.abilityFlags&0x40))curveMask&=~2;}
 const dx=(((q.cup.x<<10)-q.x)+512)|0,dz=(((q.cup.z<<10)-q.z)+512)|0;
 const sx=Math.imul(dx,25)>>10,sz=Math.imul(dz,25)>>10;
 const squared=(Math.imul(sx,sx)+Math.imul(sz,sz))|0;
 const distance=squared<0?-2147483648:Math.trunc(Math.sqrt(squared));
 const target={...q.cup},heading=originalHeading(sx,sz);
 const nextShotCounter=(q.shotCounter+1)&255;
 const followingRange=nextRange({shotCounter:nextShotCounter,target,heading,mode});
 return {mode,curveMask,target,heading,distance,needsMoreThanTwoShots:distance>((q.range+followingRange)|0),shotCounter:q.shotCounter};
}
