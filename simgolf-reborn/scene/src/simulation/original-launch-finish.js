import {originalRandom} from './original-rng.js';
// 0x4256bf–0x425ab9. Raw lie dispatch and final normalization; inputs
// are state after preceding recovery/accuracy effects, not nominal club data.
const dispatch=[0,1,2,3,8,4,4,8,8,4,5,6,7,7,6,6,6,6,8,8,8,8,4,4];
export function originalLaunchFinish(q) {
 let {speed,verticalSpeed,heading,angularOffset,actorFlags}=q;
 const {lie,curveOffset,baseSpeed,modifier,club,variant,stateFlags,tileFlags,skillMask,shotClass,mode,seed}=q;
 if(![speed,verticalSpeed,heading,angularOffset,actorFlags,lie,curveOffset,baseSpeed,modifier,club,variant,stateFlags,tileFlags,skillMask,shotClass,mode].every(Number.isInteger)||
 speed<0||speed>999999||baseSpeed<0||baseSpeed>999999||heading<0||heading>0xffffffff||mode<0||mode>3)
 throw Error('Invalid original launch finish.');
 const rng=originalRandom(seed),draw=n=>rng.next(Math.max(1,n&0xffff));
 angularOffset=(angularOffset+curveOffset)|0;
 const branch=lie>=-1&&lie<=22?dispatch[lie+1]:8;
 const vary=(denominator,bonus)=>{const sample=draw(Math.trunc(speed/denominator));speed=(speed+Math.trunc(speed/bonus)-sample)|0;};
 switch(branch){
 case 0:break;
 case 1:vary(4,8);break;
 case 2:vary(8,12);if(club===13)verticalSpeed=0;break;
 case 3:if(tileFlags&0x800)vary(1,2);else vary(3,6);break;
 case 4:
  vary(2,4);
  angularOffset=(angularOffset+draw(Math.trunc(angularOffset/2)))|0;
  if(lie===(variant===1?4:5))heading=(heading+(angularOffset<<2))>>>0;
  if(stateFlags&2)vary(2,4);
  break;
 case 5:speed=draw(speed<<1);heading=(heading+(angularOffset<<4))>>>0;break;
 case 6:vary(2,4);break;
 case 7:{const sample=draw(speed);speed=(Math.trunc(speed/2)+sample)|0;break;}
 default:vary(1,2);
 }
 if(((skillMask&2)&&shotClass<=0)||(actorFlags&1))speed=Math.trunc(((speed+baseSpeed)|0)/2);
 if(mode===0)speed=(speed+Math.trunc(Math.imul(shotClass,(speed-baseSpeed)|0)/8))|0;
 speed=Math.max(speed,Math.trunc(baseSpeed/3));
 if(mode>=2)speed=baseSpeed;
 if(mode===1)speed=Math.trunc(((speed+2*baseSpeed)|0)/3);
 speed=(speed+Math.trunc(Math.imul(Math.max(-10,Math.min(16,modifier)),(baseSpeed-speed)|0)/16))|0;
 angularOffset=Math.max(-0x15555555,Math.min(0x15555555,angularOffset));
 return {speed,verticalSpeed,heading,angularOffset,actorFlags:(actorFlags&~1)>>>0,seed:rng.state,draws:rng.draws};
}
