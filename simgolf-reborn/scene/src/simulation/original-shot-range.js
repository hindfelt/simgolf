// Original 0x4219e0–0x421b47. Surface lookup is supplied separately: its
// shotClass must describe the effective lie after the special-actor override.
// Its meaning must not be inferred from the browser's different terrain catalogue.
export function originalShotRange({actorId,skillMask,difficulty,level,surface,
  shot,professional,abilityFlags,power,longDrive,boost,lengthBonus,shotClass}) {
  const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  if(!integer(actorId,0,255)||!integer(skillMask,0,255)||!integer(difficulty,0,3)||
    !integer(level,-128,127)||!integer(surface,0,127)||!integer(shot,0,255)||
    typeof professional!=='boolean'||!integer(abilityFlags,0,65535)||
    !integer(power,0,255)||!integer(longDrive,0,255)||!integer(boost,-128,127)||
    !integer(lengthBonus,0,100)||!integer(shotClass,-128,127))
    throw Error('Invalid original shot range inputs.');
  const length=(skillMask&1)!==0;
  let range=length?200:150;
  range+=difficulty>=1?Math.trunc(level*50/3):(length?40:25);
  // Special actors (including design actor 154) use fairway on shot zero,
  // surface 2 on later shots, regardless of the map lookup result.
  const lie=actorId>=152?(shot?2:0):surface;
  if(professional) {
    if(abilityFlags&1)range+=power*4-20;
    if((abilityFlags&2)&&lie===0)range+=(longDrive-5)*6;
  }
  if(boost>0)range+=Math.trunc(Math.min(boost,3)*range/24);
  if(length)range+=lengthBonus*15;
  if(shotClass>0)range-=Math.trunc(Math.min(shotClass,3)*range/8);
  if(lie!==0)range+=Math.trunc(-range/5);
  return Math.min(range,330);
}
