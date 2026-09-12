const duration={approach:20,landing:12,taxiIn:10,unloading:5,boarding:5,taxiOut:10,departing:15};
export function stepAircraft(g,api){
 if(g.courseLocked)return;
 for(const f of g.facilities){
  if(f.type!=='airstrip')continue;
  f.nextFlight??=g.time+240;
  let s=f.aircraft;
  if(!s){
   if(g.time<f.nextFlight||!api.connected(g,f)||!api.ready())continue;
   s=f.aircraft={phase:'approach',since:g.time,guests:[]};
   api.event('A light aircraft is approaching the airstrip.');
  }
  for(const id of s.guests){const r=g.guestRoster?.find(v=>v.id===id);if(r&&r.nextVisitAt!==null)r.nextVisitAt=Math.max(r.nextVisitAt,g.time+300);}
  const change=phase=>{s.phase=phase;s.since=g.time;};
  if(s.phase==='parked'){
   if(!s.guests.some(id=>g.guests.some(v=>v.id===id)))change('boarding');
   continue;
  }
  if(g.time-s.since<duration[s.phase])continue;
  if(s.phase==='approach')change('landing');
  else if(s.phase==='landing')change('taxiIn');
  else if(s.phase==='taxiIn')change('unloading');
  else if(s.phase==='unloading'){
   if(!api.connected(g,f)){change('taxiOut');continue;}
   if(!api.ready())continue;
   const p=api.entrance(g,f);s.guests=p?api.arrive(p):[];
   if(s.guests.length){f.served=(f.served||0)+s.guests.length;api.event('Aircraft passengers have arrived for their visit.');change('parked');}
   else change('taxiOut');
  }else if(s.phase==='boarding')change('taxiOut');
  else if(s.phase==='taxiOut')change('departing');
  else if(s.phase==='departing'){
   delete f.aircraft;f.nextFlight=g.time+480;api.event('The visiting aircraft has departed.');
  }
 }
}
export function aircraftPose(s,time){
 if(!s)return null;
 const t=Math.max(0,Math.min(1,(time-s.since)/(duration[s.phase]||1)));
 let x=9,y=0,z=2.4,heading=Math.PI;
 if(s.phase==='approach'){x=-100+74*t;y=22*(1-t);z=-2;heading=Math.PI;}
 else if(s.phase==='landing'){x=-26+42*t;z=-2;}
 else if(s.phase==='taxiIn'){x=16-7*t;z=-2+4.4*t;heading=Math.PI+Math.sin(t*Math.PI)*Math.PI/2;}
 else if(s.phase==='taxiOut'){x=9-35*t;z=2.4-4.4*Math.min(1,t*3);heading=t<.2?Math.PI*(1-t/.2):t>.8?Math.PI*(t-.8)/.2:0;}
 else if(s.phase==='departing'){x=-26+130*t*t;y=32*Math.max(0,(t-.35)/.65);z=-2;}
 return {x,y,z,heading,propeller:!['parked','boarding','unloading'].includes(s.phase)};
}
export function validateAircraft(g){
 for(const f of g.facilities){
  if(f.nextFlight!==undefined&&(!Number.isFinite(f.nextFlight)||f.nextFlight<0))throw Error('Invalid flight schedule.');
  const s=f.aircraft;if(s===undefined)continue;
  if(f.type!=='airstrip'||!s||(!Object.hasOwn(duration,s.phase)&&s.phase!=='parked')||
   !Number.isFinite(s.since)||s.since<0||s.since>g.time||!Array.isArray(s.guests)||s.guests.length>2||
   new Set(s.guests).size!==s.guests.length||s.guests.some(id=>!Number.isSafeInteger(id)))throw Error('Invalid aircraft visit.');
 }
}
