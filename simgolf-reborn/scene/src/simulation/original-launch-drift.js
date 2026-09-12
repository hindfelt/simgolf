import {originalRandom} from './original-rng.js';
// 0x405710 and 0x424170–0x424283. Initial angular offset before
// special club/shot overrides. Settings are original integer fields.
export function originalLaunchDrift({mode,attitude,terrainCode,actorClass,skillMask,actorFlags,accuracySetting,level,seed}) {
 if(![mode,attitude,terrainCode,actorClass,skillMask,actorFlags,accuracySetting,level].every(Number.isInteger)||
 mode<0||mode>3||attitude< -128||attitude>127||actorClass<0||actorClass>255||accuracySetting<0||accuracySetting>3||level<0||level>3)
 throw Error('Invalid original launch drift inputs.');
 const rng=originalRandom(seed);let angularOffset=0;
 if(mode<2){
  const sample=rng.next(101)-50,absolute=Math.abs(sample);
  const amount=absolute<20?Math.trunc(absolute/2):absolute<40?absolute-10:absolute*2-50;
  angularOffset=((sample>0?amount:-amount)*5)<<16;
 }
 if(mode===1)angularOffset=Math.trunc(angularOffset/3);
 if(attitude<0)angularOffset=(angularOffset+Math.trunc(Math.imul(Math.min(3,-attitude),angularOffset)/(terrainCode===1?8:3)))|0;
 if(terrainCode!==1&&(actorClass&0xe0)!==0x20&&((skillMask&2)||(actorFlags&1))){
  angularOffset=Math.trunc(angularOffset/(accuracySetting+2));
  if(level<2)angularOffset-=Math.trunc(angularOffset/(level+2));
 }
 if((actorFlags&0x4000000)&&(actorClass&0xe0)!==0x20)angularOffset-=Math.trunc(angularOffset/3);
 return {angularOffset,seed:rng.state,draws:rng.draws};
}
