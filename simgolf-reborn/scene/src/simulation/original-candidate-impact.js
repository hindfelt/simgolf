import {originalRandom} from './original-rng.js';
// After rebound: 0x4221d7–0x4223e4. slopeAt returns original 0x40c140
// values; facing is the direction captured before contact processing.
export function originalCandidateImpact({speed,heading,verticalSpeed,flags,professional,
 luck,seed,skillMask,facing,terrainCode,boundaryFlags,terrainFlags,centre,mode,slopeAt}) {
 if(!Number.isInteger(speed)||speed<0||speed>32767||!Number.isInteger(heading)||heading<0||heading>0xffffffff||
   !Number.isInteger(verticalSpeed)||verticalSpeed<0||verticalSpeed>9999||!Number.isInteger(flags)||flags<0||flags>0xffffffff||
   typeof professional!=='boolean'||!Number.isInteger(luck)||luck<0||luck>255||
   !Number.isInteger(skillMask)||!Number.isInteger(facing)||facing<0||facing>7||
   !Number.isInteger(terrainCode)||!Number.isInteger(boundaryFlags)||!Number.isInteger(terrainFlags)||
   typeof centre!=='boolean'||!Number.isInteger(mode))throw Error('Invalid original candidate impact.');
 const random=originalRandom(seed);
 const draw=bound=>random.next(Math.max(1,bound)); // Bound zero still advances the original LCG and returns zero.
 if(flags&0x100) {
   heading=(heading^0x80000000)>>>0;flags=(flags&~0x100)>>>0;
   const value=draw(speed*2);
   speed=professional?speed+Math.trunc((value-speed)*3/(luck+5)):value;
 }
 if(flags&0x80){speed=Math.trunc(speed/2);flags=((flags&~0x80)|0x100)>>>0;}
 if(skillMask&4) {
   if(typeof slopeAt!=='function')throw Error('Original impact needs slope samples.');
   const slope=direction=>{
     const n=slopeAt(direction);
     if(!Number.isInteger(n)||n< -2147483648||n>2147483647)throw Error('Invalid original impact slope.');
     return n;
   };
   const crossDirection=((((heading>>>29)+1)&~1)+2)&7;
   heading=(heading-Math.imul(slope(crossDirection),Math.imul(verticalSpeed,0xaec33)))>>>0;
   const clamp=n=>Math.max(-2,Math.min(2,n));
   speed=(speed-2*Math.imul(clamp(slope(facing)),verticalSpeed))|0;
   verticalSpeed=(verticalSpeed+Math.trunc(Math.imul(clamp(slope(facing)),verticalSpeed)/2))|0;
 }
 if(terrainCode===17&&!boundaryFlags&&!(mode===0&&centre&&(terrainFlags&0x20)))speed=verticalSpeed=0;
 if(terrainCode===12&&speed>256&&!boundaryFlags)heading=(heading+((80-draw(160))<<24))>>>0;
 return {speed,heading,verticalSpeed,flags,seed:random.state,draws:random.draws};
}
