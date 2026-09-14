import {center} from '../simulation/world.js';
import {TENNIS_SECONDS} from '../simulation/tennis-visits.js';
// Presentation is sampled from the saved simulation clock: paused games stop
// moving and a reload resumes the same rally without changing game state.
export function tennisPose(g,v){
  if(v.phase!=='service' || v.tennis?.startedAt==null)return null;
  const f=g.facilities.find(f=>f.id===v.tennis.facilityId);
  if(!f)return null;
  const age=g.time-v.tennis.startedAt;
  const blend=Math.max(0,Math.min(1,age/2,(TENNIS_SECONDS-age)/2));
  const side=v.id<v.tennis.partnerId?-1:1;
  const localX=-3.2+Math.sin(age*1.5)*.55,localZ=side*4;
  const yaw=(f.rotation||0)*Math.PI/2,c=center(f.c,f.r);
  const x=c.x+localX*Math.cos(yaw)+localZ*Math.sin(yaw);
  const z=c.z-localX*Math.sin(yaw)+localZ*Math.cos(yaw);
  return {center:c,x:v.pos.x+(x-v.pos.x)*blend,z:v.pos.z+(z-v.pos.z)*blend,
    heading:yaw+(side>0?Math.PI:0),swing:-.7+Math.sin(age*Math.PI*1.5+side*Math.PI/2)*.6,blend};
}
export function updateTennisBall(group,g,f){
  const ball=group.userData.tennisBall;if(!ball)return;
  const v=g.guests.find(v=>v.tennis?.facilityId===f.id && v.phase==='service' && v.tennis.startedAt!==null);
  const age=v?g.time-v.tennis.startedAt:0;
  ball.visible=!!v && age>2 && age<TENNIS_SECONDS-2;
  if(!ball.visible)return;
  const phase=((age-2)*.75)%2,t=phase<1?phase:2-phase;
  ball.position.set(-3.2+Math.sin(age*1.5)*.55,.5+Math.sin(t*Math.PI)*1.1,-4+8*t);
}
