import {originalRandom} from './original-rng.js';
// 0x425589–0x4256bf, including short-shot side branch at 0x42574c.
// terrainClass supplies original signed metadata for the current effective lie.
export function originalLaunchRecovery(q,terrainClass) {
 let {heading,angularOffset,actorFlags,lie}=q;
 const {strength,level,actorId,targetArgument,skillMask,actorClass,recoveryValue,mode,shotCounter,baseSpeed,seed}=q;
 if(![heading,angularOffset,actorFlags,lie,strength,level,actorId,targetArgument,skillMask,actorClass,recoveryValue,mode,shotCounter,baseSpeed].every(Number.isInteger)||
 heading<0||heading>0xffffffff||angularOffset< -2147483648||angularOffset>2147483647||level<0||level>3||recoveryValue<0||recoveryValue>255||
 mode<0||mode>3||typeof terrainClass!=='function')throw Error('Invalid original launch recovery.');
 const rng=originalRandom(seed);
 if(strength<75){
  if(level===0&&actorId===targetArgument)angularOffset=Math.trunc(angularOffset/3);
  else{
   if(level===0&&actorId===(targetArgument|1))angularOffset=angularOffset<<1;
   if(lie!==1){const factor=(skillMask&7)===7?level+4:9-level;heading=(heading+(Math.imul(factor,angularOffset)<<1))>>>0;}
  }
 }
 const initialClass=actorClass!==0?terrainClass(lie):0;
 if(actorClass!==0&&initialClass>0&&recoveryValue>=rng.next(initialClass*10)){
  lie=2;actorFlags=(actorFlags|0x400000)>>>0;
 }
 if(mode===0&&lie!==1){
  const sample=rng.next(0x5555),shotClass=terrainClass(lie);
  const sign=angularOffset>0?1:angularOffset<0?-1:0;
  heading=(heading+Math.imul(Math.imul(sign,sample+0x1555555),shotClass))>>>0;
  angularOffset=Math.trunc(Math.imul(shotClass+2,angularOffset)/2);
 }
 if((actorFlags&1)&&shotCounter>6)lie=-1;
 return {heading,angularOffset,actorFlags:actorFlags>>>0,lie,speed:baseSpeed,seed:rng.state,draws:rng.draws};
}
