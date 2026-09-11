import {originalPreparedRouteSearch} from './original-route-search-anchor.js';
import {originalRouteSearchPasses} from './original-route-search-passes.js';
import {originalRouteFinish} from './original-route-finish.js';
import {originalRouteEntry} from './original-route-entry.js';
import {originalShotRange} from './original-shot-range.js';
// Search body after entry initialization (0x42252c), through publication.
// Callbacks own the range query, candidate physics and follow-up assessment.
export function originalRouteSearch(q,nextRange,simulate) {
 const prepared=originalPreparedRouteSearch({...q,x:q.origin.x,z:q.origin.z},nextRange);
 const search=originalRouteSearchPasses({...q,anchor:prepared.anchor,
  shapeMask:prepared.curveMask,cupDistance:prepared.distance,mode:prepared.mode,
  beyondTwoShots:prepared.needsMoreThanTwoShots,distanceDivisor:prepared.distanceDivisor,
  samples:prepared.samples,work:prepared.work},simulate);
 const result=originalRouteFinish({...q,mode:prepared.mode,winner:search.winner,
  diagnostics:search.diagnostics,cornerTarget:search.winner.cornerTarget});
 return {search,result};
}

// The initial range query has search flags but retains the actor's old aim;
// the subsequent query receives the temporary next-shot counter and cup aim.
export function originalEnteredRouteSearch(q,initialRange,nextRange,simulate) {
 const entry=originalRouteEntry(q,initialRange);
 const shotClass=q.terrainAt(entry.originTile).shotClass;
 return originalRouteSearch({...q,...entry,shotClass,originClass:shotClass,
  winner:{...q.winner,target:{...q.winner.target,x:entry.winnerTargetX},
   curve:entry.curve,cornerTarget:entry.cornerTarget}},nextRange,simulate);
}

export function originalRangedRouteSearch(q,simulate) {
 const tile={x:q.origin.x>>10,z:q.origin.z>>10};
 const surface=q.terrainAt(tile).code;
 const rangeFor=shot=>{
  const lie=q.actorId>=152?(shot?2:0):surface;
  return originalShotRange({...q.rangeInput,actorId:q.actorId,skillMask:q.skillMask,
   professional:q.actorClass!==0,abilityFlags:q.abilityFlags,shot,surface,
   shotClass:q.shotClassAt(lie)});
 };
 return originalEnteredRouteSearch({...q,shot:q.shotCounter},()=>rangeFor(q.shotCounter),
  c=>rangeFor(c.shotCounter),simulate);
}
