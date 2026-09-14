import {originalLaunchBase} from './original-launch-base.js';
import {originalLaunchVariation} from './original-launch-variation.js';
import {originalStrengthSearch} from './original-strength-search.js';
import {originalLaunchDrift} from './original-launch-drift.js';
import {originalClubDrift} from './original-club-drift.js';
import {originalPuttingDeviation} from './original-putting.js';
import {originalLaunchHeading} from './original-launch-heading.js';
// Launch core 0x423f48–0x424697. The second search uses full shot range,
// not nominal strength. The original RNG callee removes its stack argument.
export function originalLaunchCore(q,cache) {
 const base=originalLaunchBase(q,cache);
 const variation=originalLaunchVariation(q);
 const reference=originalStrengthSearch({distance:Math.trunc(q.range*4/5),verticalSpeed:base.verticalSpeed,mode:0},base.cache);
 const drift=originalLaunchDrift({...q,mode:q.driftMode,seed:variation.seed});
 const actorFlags=(q.actorFlags&~0x400000)>>>0;
 let result;
 if(base.club===13){
  const putt=originalPuttingDeviation({distanceYards:base.strength,toleranceYards:variation.variation,
   doubleDistanceFlag:!!(q.worldFlags&0x200000),seed:drift.seed});
  result={heading:q.heading,referenceHeading:(q.heading+(q.curve===1?0x15555554:q.curve===-1?-0x15555554:0))>>>0,
   angularOffset:putt.angularOffset,modifier:-3,actorFlags,seed:putt.rngState};
 }else{
 const club=originalClubDrift({...q,club:base.club,angularOffset:drift.angularOffset});
 result=originalLaunchHeading({...q,...club,actorFlags,globalFlags:q.worldFlags,mode:q.driftMode,
  distance:base.strength,speed:base.speed,seed:drift.seed});
 }
 return {club:base.club,speed:base.speed,verticalSpeed:base.verticalSpeed,referenceSpeed:reference.speed,
  variation:variation.variation,heading:result.heading,referenceHeading:result.referenceHeading,
  angularOffset:result.angularOffset,modifier:result.modifier,actorFlags:result.actorFlags,
  seed:result.seed,cache:reference.cache};
}
