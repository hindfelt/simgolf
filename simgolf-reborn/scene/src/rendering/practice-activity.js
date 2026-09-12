import {center} from '../simulation/world.js';
export function practicePose(g,v){
 if(v.phase!=='service'||!v.practiceFacilityId)return null;
 const f=g.facilities.find(f=>f.id===v.practiceFacilityId);
 if(!f)return null;
 const age=v.wait||0,blend=Math.max(0,Math.min(1,age/2,(24-age)/2));
 const c=center(f.c,f.r),yaw=(f.rotation||0)*Math.PI/2;
 const localX=((Math.floor(v.id/3)%3)-1)*2.5,localZ=f.type==='driving-range'?2.6:1;
 const x=c.x+localX*Math.cos(yaw)+localZ*Math.sin(yaw),z=c.z-localX*Math.sin(yaw)+localZ*Math.cos(yaw);
 return {center:c,blend,x:v.pos.x+(x-v.pos.x)*blend,z:v.pos.z+(z-v.pos.z)*blend,
  heading:yaw+Math.PI,swing:-.4-Math.max(0,Math.sin(age*2))*(f.type==='driving-range'?1.2:.25)};
}
