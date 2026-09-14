// Shared motion sampling for gameplay, collision checks and visual previews.
// Keeping the legacy arithmetic/order here preserves existing replay behavior.
export function airbornePoint(shot, t) {
  if(shot.nativeFlight){
    const samples=shot.nativeFlight.samples,index=Math.max(0,Math.min(samples.length-1,t*(samples.length-1)));
    const a=samples[Math.floor(index)],b=samples[Math.min(samples.length-1,Math.floor(index)+1)],u=index-Math.floor(index);
    return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,lift:a.lift+(b.lift-a.lift)*u};
  }
  const bend = Math.sin(t * Math.PI) * shot.curve;
  const dx = shot.landing.x - shot.from.x, dz = shot.landing.z - shot.from.z;
  const length = Math.hypot(dx, dz) || 1;
  return {x:shot.from.x + dx*t - (dz/length)*bend,
    z:shot.from.z + dz*t + (dx/length)*bend,
    lift:4*shot.apex*t*(1-t)};
}
export function releasePoint(shot,t) {
  if(shot.nativeRelease){
    const samples=shot.nativeRelease.samples,index=Math.max(0,Math.min(samples.length-1,t*(samples.length-1)));
    const a=samples[Math.floor(index)],b=samples[Math.min(samples.length-1,Math.floor(index)+1)],u=index-Math.floor(index);
    return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,lift:a.lift+(b.lift-a.lift)*u};
  }
  const u=1-(1-t)**2;
  let lift=0;
  if(t<.2)lift=Math.sin(t/.2*Math.PI)*(shot.bounce??.35);
  else if(t<.33)lift=Math.sin((t-.2)/.13*Math.PI)*(shot.bounce??.35)*.28;
  return {x:shot.landing.x+(shot.end.x-shot.landing.x)*u,
    z:shot.landing.z+(shot.end.z-shot.landing.z)*u,lift};
}
