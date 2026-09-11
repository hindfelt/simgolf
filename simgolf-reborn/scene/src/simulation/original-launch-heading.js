import {originalRandom} from './original-rng.js';
// Non-putter path 0x424542–0x424697, with shared reference-heading branch.
// The caller has already cleared actor flag 0x400000 at 0x424283.
export function originalLaunchHeading({heading,angularOffset,modifier,actorFlags,globalFlags,
 distance,speed,activeActor,curve,mode,actorClass,seed}) {
 if(![heading,angularOffset,modifier,actorFlags,globalFlags,distance,speed,curve,mode,actorClass].every(Number.isInteger)||
 heading<0||heading>0xffffffff||angularOffset< -2147483648||angularOffset>2147483647||speed<0||speed>2147483647||
 distance<0||distance>330||actorClass<0||actorClass>255||typeof activeActor!=='boolean')throw Error('Invalid original launch heading.');
 const rng=originalRandom(seed);let miss=false;
 if(!(globalFlags&0x800000)&&distance>75){
  const draw=rng.next(Math.max(1,speed&0xffff));
  const absolute=angularOffset===-2147483648?-2147483648:Math.abs(angularOffset);
  if(draw>(absolute>>9)+512){
   miss=true;actorFlags=(actorFlags|0x400000)>>>0;modifier+=4;
   angularOffset=activeActor?0:Math.trunc(angularOffset/2);
  }
 }
 const referenceHeading=(heading+(curve===1?0x15555554:curve===-1?-0x15555554:0))>>>0;
 const clamped=Math.max(-0x38e38e3,Math.min(0x38e38e3,angularOffset));
 heading=(heading+Math.imul(clamped,3))>>>0;
 angularOffset=(angularOffset-Math.trunc(clamped/2))|0;
 if(mode===0&&(actorClass&0xe0)===0x20){
  angularOffset=(angularOffset+Math.trunc(Math.imul(distance-100,angularOffset)/256))|0;
  angularOffset=(angularOffset+Math.trunc((rng.next(0x71c6)-0x38e38e3)/50))|0;
 }
 return {heading,referenceHeading,angularOffset,modifier,actorFlags:actorFlags>>>0,seed:rng.state,draws:rng.draws,miss};
}
