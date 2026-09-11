import {originalLaunchBase} from './original-launch-base.js';
import {originalLaunchVariation} from './original-launch-variation.js';
import {originalStrengthSearch} from './original-strength-search.js';
import {originalLaunchDrift} from './original-launch-drift.js';
import {originalClubDrift} from './original-club-drift.js';
import {originalLaunchHeading} from './original-launch-heading.js';
// Non-putter 0x423f48–0x424697. The second search uses full shot range,
// not nominal strength. The original RNG callee removes its stack argument.
export function originalLaunchCore(q,cache) {
 const base=originalLaunchBase(q,cache);
 if(base.club===13)throw Error('Putter launch requires its separate branch.');
 const variation=originalLaunchVariation(q);
 const reference=originalStrengthSearch({distance:Math.trunc(q.range*4/5),verticalSpeed:base.verticalSpeed,mode:0},base.cache);
 const drift=originalLaunchDrift({...q,mode:q.driftMode,seed:variation.seed});
 const actorFlags=(q.actorFlags&~0x400000)>>>0;
 const club=originalClubDrift({...q,club:base.club,angularOffset:drift.angularOffset});
 const result=originalLaunchHeading({...q,...club,actorFlags,globalFlags:q.worldFlags,mode:q.driftMode,
  distance:base.strength,speed:base.speed,seed:drift.seed});
 return {club:base.club,speed:base.speed,verticalSpeed:base.verticalSpeed,referenceSpeed:reference.speed,
  variation:variation.variation,heading:result.heading,referenceHeading:result.referenceHeading,
  angularOffset:result.angularOffset,modifier:result.modifier,actorFlags:result.actorFlags,
  seed:result.seed,cache:reference.cache};
}
