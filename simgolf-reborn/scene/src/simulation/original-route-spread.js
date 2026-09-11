import {originalRouteSegment} from './original-route-distance.js';
import {originalRoutePruning} from './original-route-pruning.js';
import {originalHeading} from './original-heading.js';
// 0x42338e–0x423402, reached for surviving options on the four-sample pass.
export function originalRouteSpread(q) {
 const result={...q.spread};
 if(q.storedDistance===0)return result;
 result.minDistance=Math.min(result.minDistance,q.storedDistance);
 result.maxDistance=Math.max(result.maxDistance,q.storedDistance);
 if(originalRouteSegment(q.origin,q.target)>100){
  const delta=(q.sampleFlags-q.cupHeading)|0;
  result.minHeading=Math.min(result.minHeading,delta);result.maxHeading=Math.max(result.maxHeading,delta);
 }
 return result;
}
export function originalRoutePrunedState(q) {
 const pruned=originalRoutePruning(q);
 let spread={minDistance:65535,maxDistance:-1000,minHeading:0x0fffffff,maxHeading:-536870912};
 if(q.samples===4){
  const cupHeading=originalHeading(((q.cup.x<<10)-q.origin.x+512)|0,((q.cup.z<<10)-q.origin.z+512)|0);
  for(const {candidate,option} of pruned.survivors){
   spread=originalRouteSpread({spread,origin:q.origin,target:{x:q.anchor.x+Math.trunc(candidate/21)-10,z:q.anchor.z+candidate%21-10},
    storedDistance:q.distances[candidate][option],sampleFlags:q.flags[candidate][option],cupHeading});
  }
 }
 return {...pruned,spread};
}
