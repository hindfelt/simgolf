import {originalPreparedRouteSearch} from './original-route-search-anchor.js';
import {originalRouteSearchPasses} from './original-route-search-passes.js';
import {originalRouteFinish} from './original-route-finish.js';
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
