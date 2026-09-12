export function helicopterPose(h,time){
 const t=Math.max(0,time-h.since);let x=h.pad.x,z=h.pad.z,lift=0;
 if(h.phase==='arriving'){
  const u=Math.min(1,t/24);
  if(u<.65){const a=u/.65;x+=-75+95*a;z+=-35+30*Math.sin(a*Math.PI);lift=22;}
  else{const a=(u-.65)/.35;x+=20*(1-a);z-=35*(1-a);lift=22*(1-a);}
 }else if(h.phase==='departing'){
  const u=Math.min(1,t/20);lift=Math.min(24,u*60);x+=80*u*u;z-=60*u*u;
 }
 const power=h.phase==='parked'?0:h.phase==='unloading'?Math.max(0,1-t/5):h.phase==='boarding'?Math.min(1,t/5):1;
 return {x,z,lift,power,base:h.pad};
}
