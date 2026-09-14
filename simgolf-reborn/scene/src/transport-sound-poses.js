import {aircraftPose} from './simulation/aircraft.js';
import {marinaPoint} from './simulation/marina-activity.js';
import {center} from './simulation/world.js';
// Read the same saved transport phases and transforms used by the renderer.
export function transportSoundPoses(g){
 const result=[];
 for(const f of g.facilities||[]){
  if(f.type==='marina'&&['arriving','departing'].includes(f.marinaActivity?.phase)&&!f.marinaActivity.blocked){
   result.push({kind:'boat',...marinaPoint(f,f.marinaActivity.offset),level:.32});
  }
  if(f.type==='airstrip'){
   const pose=aircraftPose(f.aircraft,g.time);if(!pose?.propeller)continue;
   const base=center(f.c,f.r),a=(f.rotation||0)*Math.PI/2;
   result.push({kind:'plane',x:base.x+pose.x*Math.cos(a)+pose.z*Math.sin(a),z:base.z-pose.x*Math.sin(a)+pose.z*Math.cos(a),base,lift:pose.y,level:.45});
  }
 }
 return result;
}
