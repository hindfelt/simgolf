import {originalHeading} from './original-heading.js';
// 0x42365d–0x423770. Planner argument is an exact fixed-point target x;
// -1 selects tile-center targeting. Its companion argument is target z.
export function originalTargetGeometry(q) {
 let target={...(q.explicitTarget?q.target:q.cup)},curve=q.curve;
 if(q.explicitTarget)curve=q.mode<=1?q.mode:0;
 let dx=(((target.x<<10)-q.x)+512)|0,dz=(((target.z<<10)-q.z)+512)|0;
 if(q.plannerArgument!==-1){
  dx=(q.plannerArgument-q.x)|0;dz=(q.targetZ-q.z)|0;
  target={x:q.plannerArgument>>10,z:q.targetZ>>10};
 }
 const sx=Math.imul(dx,25)>>10,sz=Math.imul(dz,25)>>10;
 const squared=(Math.imul(sx,sx)+Math.imul(sz,sz))|0;
 const distance=squared<0?-2147483648:Math.trunc(Math.sqrt(squared));
 const heading=originalHeading(dx,dz);
 return {target,curve,distance,heading,actorFlags:(q.actorFlags&0xefffffff)>>>0};
}
