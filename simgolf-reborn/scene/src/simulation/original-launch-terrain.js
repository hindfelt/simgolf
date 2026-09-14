import {originalLaunchCore} from './original-launch-core.js';
import {originalShotClub} from './original-shot-club.js';
import {originalLowShotGate,originalLowShot} from './original-low-shot.js';
import {originalApproachShot} from './original-approach-shot.js';
// 0x423f48–0x424988, through terrain-dependent shot selection. Later
// launch effects still follow; do not treat this as the complete planner.
export function originalLaunchTerrain(q,cache,kindAt) {
 const core=originalLaunchCore(q,cache),strength=originalShotClub(q).strength;
 const actorFlags=(core.actorFlags&~0x180)>>>0;
 const gate=originalLowShotGate({...q,actorFlags,referenceHeading:core.referenceHeading},kindAt);
 let selected;
 if(gate.eligible){
  selected=originalLowShot({speed:core.speed,strength,firstWaterIndex:gate.index},core.cache);
 }else{
  selected=originalApproachShot({...q,...core,actorFlags,strength},core.cache);
 }
 return {...core,actorFlags,...selected,curve:selected.curve??q.curve};
}
