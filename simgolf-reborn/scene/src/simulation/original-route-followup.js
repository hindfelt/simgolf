// Follow-up assessment orchestration, 0x422e99–0x423098. assessShot must
// supply original 0x421450 costs, not the browser heuristic's ratings.
export function originalRouteFollowup({score,samples,mode,skillMask,beyondTwoShots,
 lie,range,shot,remaining,landingClass,shapeMask,followupFlag,landing,cup,assessShot}) {
 if(!Number.isInteger(score)||![2,4,8].includes(samples)||!Number.isInteger(mode)||
   !Number.isInteger(skillMask)||typeof beyondTwoShots!=='boolean'||!Number.isInteger(lie)||
   !Number.isInteger(range)||range<=0||range>330||!Number.isInteger(shot)||shot<0||
   !Number.isInteger(remaining)||remaining<0||!Number.isInteger(landingClass)||
   !Number.isInteger(shapeMask)||shapeMask<0||shapeMask>3||!Number.isInteger(followupFlag))
   throw Error('Invalid original follow-up inputs.');
 if(samples!==4||mode===2||!(skillMask&4)||beyondTwoShots)return {score,followupFlag};
 if(typeof assessShot!=='function'||!landing||!cup)throw Error('Original follow-up needs an assessor and endpoints.');
 const assess=(shape,flag)=>{
   const cost=assessShot({landing:{...landing},cup:{...cup},range,shape,flag});
   if(!Number.isInteger(cost)||cost<0)throw Error('Invalid original follow-up cost.');
   return cost;
 };
 if(lie>0)return {score:score+2*assess(0,0),followupFlag};
 if(shot===0)range-=Math.trunc(range/5);
 if(landingClass<=0&&remaining>=50&&Math.trunc(60*(range-remaining)/(3*range))>=4)followupFlag=1;
 let cost=assess(0,followupFlag);
 if(shapeMask&1)cost=Math.min(cost,assess(-1,0));
 if(shapeMask&2)cost=Math.min(cost,assess(1,0));
 return {score:score+Math.trunc(cost/2),followupFlag};
}
