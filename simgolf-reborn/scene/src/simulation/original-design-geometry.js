import {originalHeading} from './original-heading.js';
import {originalDoglegFromPoints} from './original-hole-variety.js';

// 0x413619–0x413814. routeMeasure is the original accumulated measure;
// do not pass browser yards without converting its upstream planner units.
export function originalDesignGeometry({tee, green, firstLanding, routeMeasure, teeHeight, greenHeight, flags=0}) {
  if (![tee,green,firstLanding].every(p=>p && [p.x,p.z].every(n=>Number.isInteger(n) && n>=-0x80000000 && n<=0x7fffffff)) ||
      !Number.isInteger(routeMeasure) || routeMeasure<0 || routeMeasure>0x7fffffff ||
      ![teeHeight,greenHeight].every(n=>Number.isInteger(n) && n>=0 && n<=255) ||
      !Number.isInteger(flags) || flags<0 || flags>0xffffffff)
    throw Error('Invalid original design geometry.');
  const heading=originalHeading((firstLanding.x-tee.x)|0,(firstLanding.z-tee.z)|0);
  const teeFacing=(((heading>>>28)+1)>>1)&7;
  let terrainFlags=(flags & ~0x3000)>>>0;
  if(greenHeight>teeHeight+1)terrainFlags=(terrainFlags|0x1000)>>>0;
  if(greenHeight<teeHeight-1)terrainFlags=(terrainFlags|0x2000)>>>0;
  const bend=routeMeasure<250 ? {...tee} : {...firstLanding};
  const dogleg=originalDoglegFromPoints({tee,bend,green,flags:terrainFlags});
  return {teeFacing,bend,flags:dogleg.flags};
}
