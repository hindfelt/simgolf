import {center,cellAt,key,inBounds,onBridge} from './world.js';
import {facilityContains} from './facilities.js';
export function marinaPoint(f,offset=0,lateral=0){
 const p=center(f.c,f.r),a=(f.rotation||0)*Math.PI/2,z=1.7+offset;
 return {x:p.x+lateral*Math.cos(a)+z*Math.sin(a),z:p.z-lateral*Math.sin(a)+z*Math.cos(a)};
}
export function marinaChannelClear(g,f,offset){
 for(const side of [-.85,0,.85])for(const along of [-1.65,0,1.65]){
  const p=marinaPoint(f,offset+along,side),c=cellAt(p.x,p.z),k=key(c.c,c.r);
  if(!inBounds(c.c,c.r)||g.tiles[k]?.type!=='water'||g.bridges?.[k]||
    (!g.starterBridgeRemoved&&onBridge(p.x,p.z))||
    g.facilities.some(other=>other.id!==f.id&&facilityContains(other,c.c,c.r)))return false;
 }
 return true;
}
// Passenger visits use saved simulation time and positions, never render frames.
export function stepMarinas(g,dt,api){
 if(g.courseLocked)return;
 for(const f of g.facilities){
  if(f.type!=='marina')continue;
  const s=f.marinaActivity??={offset:0,direction:0,nextAt:g.time+90, trips:0,blocked:false,phase:'idle',guests:[]};
  for(const id of s.guests){
   const r=g.guestRoster?.find(r=>r.id===id);
   if(r && r.nextVisitAt!==null)r.nextVisitAt=Math.max(r.nextVisitAt,g.time+300);
  }
  const linked=api.connected(g,f);
  if(s.phase==='idle'){
   if(!linked||g.time<s.nextAt||!api.ready())continue;
   let reach=0;
   for(let d=0;d<=14;d+=.25){if(!marinaChannelClear(g,f,d))break;reach=d;}
   if(reach<6){s.blocked=true;s.nextAt=g.time+30;continue;}
   s.limit=reach;s.offset=reach;s.direction=-1;s.phase='arriving';s.blocked=false;
  }
  if(s.phase==='parked'){
   if(s.guests.some(id=>g.guests.some(v=>v.id===id)))continue;
   s.phase='boarding';s.since=g.time;
  }
  if(s.phase==='boarding'){
   if(g.time-s.since<5)continue;
   s.phase='departing';s.direction=1;
  }
  if(s.phase==='unloading'){
   if(!linked){s.phase='departing';s.direction=1;}
   else {
    if(!api.ready())continue;
    const point=api.entrance(g,f);
    s.guests=point?api.arrive(point):[];
    s.phase=s.guests.length?'parked':'departing';s.direction=s.guests.length?0:1;
    if(s.guests.length){s.entrance=point;f.served=(f.served||0)+s.guests.length;}
    continue;
   }
  }
  if(!['arriving','departing'].includes(s.phase))continue;
  const target=Math.max(0,Math.min(s.limit,s.offset+s.direction*dt*.8));
  const steps=Math.max(1,Math.ceil(Math.abs(target-s.offset)/.1));
  let clear=marinaChannelClear(g,f,s.offset);
  for(let i=1;clear&&i<=steps;i++)clear=marinaChannelClear(g,f,s.offset+(target-s.offset)*i/steps);
  if(!clear){s.blocked=true;continue;}
  s.blocked=false;s.offset=target;
  if(s.phase==='arriving'&&s.offset<=0){s.phase='unloading';s.direction=0;}
  else if(s.phase==='departing'&&s.offset>=s.limit){
   s.phase='idle';s.direction=0;s.offset=0;s.trips++;s.guests=[];
   s.nextAt=g.time+360+(f.id%4)*30;delete s.limit;delete s.entrance;
  }
 }
}
export function validateMarinas(g){
 for(const f of g.facilities){
  const s=f.marinaActivity;if(s===undefined)continue;
  if(f.type!=='marina'||!s||!Number.isFinite(s.offset)||s.offset<0||s.offset>14||
   ![0,1,-1].includes(s.direction)||!Number.isFinite(s.nextAt)||s.nextAt<0||
   !Number.isSafeInteger(s.trips)||s.trips<0||typeof s.blocked!=='boolean'||
   !['idle','arriving','unloading','parked','boarding','departing'].includes(s.phase)||
   !Array.isArray(s.guests)||s.guests.length>2||s.guests.some(id=>!Number.isSafeInteger(id))||
   (s.phase!=='idle'&&(!Number.isFinite(s.limit)||s.limit<6||s.limit>14||s.offset>s.limit))||
   (s.phase==='boarding'&&(!Number.isFinite(s.since)||s.since>g.time)))throw Error('Invalid marina activity.');
 }
}
