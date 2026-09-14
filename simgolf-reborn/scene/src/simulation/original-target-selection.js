import {originalTargetGeometry} from './original-target-geometry.js';
import {originalAutoTargetRequest} from './original-auto-target-request.js';
import {originalAutoApproach} from './original-auto-approach.js';

// Original planner 0x42365d through 0x423b66 for direct/short targets.
// Long targets stop at the route-search request (0x42381a); the projected
// waypoint is not a replacement for the search result or the cup target.
export function originalTargetSelection(q,map) {
 const geometry=originalTargetGeometry(q);
 const request=originalAutoTargetRequest({...q,...geometry});
 const shared={landing:{...q.landing},diagnostics:q.diagnostics};
 if(request.path==='approach')
  return {...geometry,...originalAutoApproach({...q,...geometry},map),request};
 return {...geometry,...shared,request};
}
