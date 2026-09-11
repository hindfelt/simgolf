import {originalProjection} from './original-projection.js';
import {originalRouteSegment} from './original-route-distance.js';
import {originalRouteSearchSetup} from './original-route-search-setup.js';
// 0x422688–0x422799: projected grid anchor and initial pass parameters.
export function originalRouteSearchAnchor(q) {
 const distance=Math.min(Math.max((q.range-25)|0,0),q.distance);
 const radius=Math.trunc((((distance<<10)+512)|0)/25)|0;
 const p=originalProjection(q.heading,radius);
 const anchor={x:((q.x+p.x)|0)>>10,z:((q.z-p.z)|0)>>10};
 // The original passes tile indices as the origin to its fixed-point helper.
 const weightingDistance=originalRouteSegment({x:q.x>>10,z:q.z>>10},q.cup);
 return {anchor,distanceDivisor:weightingDistance<100?2:weightingDistance>200?6:4,work:0,samples:2};
}

export function originalPreparedRouteSearch(q,nextRange) {
 const setup=originalRouteSearchSetup(q,nextRange);
 return {...setup,...originalRouteSearchAnchor({...q,...setup})};
}
