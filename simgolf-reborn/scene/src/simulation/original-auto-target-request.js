import {originalProjection} from './original-projection.js';
// 0x42376c–0x42381a: decide whether to search, then project its first waypoint.
// The original route search and its result processing still follow this request.
export function originalAutoTargetRequest(q) {
 if(q.explicitTarget||q.plannerArgument!==-1)return {path:'assessment'};
 const threshold=(q.actorFlags&1)||(q.skillMask&4)?25:75;
 if(q.distance<=threshold||q.terrainCode===1)return {path:'approach'};
 const rangeDistance=Math.min(Math.max((q.range-25)|0,0),q.distance);
 const radius=Math.trunc((((rangeDistance<<10)+512)|0)/25)|0;
 const p=originalProjection(q.heading,radius);
 return {path:'search',rangeDistance,radius,target:{x:((q.x+p.x)|0)>>10,z:((q.z-p.z)|0)>>10}};
}
