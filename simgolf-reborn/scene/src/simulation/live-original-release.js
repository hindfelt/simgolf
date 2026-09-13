import {originalBallPositionStep} from './original-ball-position.js';
import {originalGravityStep,originalBounce} from './original-bounce.js';
import {originalAirMotion} from './original-air-phase.js';
import {originalGroundResponse,originalBallStopped} from './original-ground-motion.js';
import {RULES} from './rules.js';
const scale=RULES.yardsPerUnit*1024/25;
// Explicit live-world surface bindings, not a claim that browser surfaces are
// retail terrain bytes. Larger resistance exponents retain more rolling speed.
const surfaces={green:[3,2],tee:[2,2],fairway:[3,4],firm:[4,6],rough:[1,1],
 'deep-rough':[0,0],sand:[0,0],'pot-bunker':[0,0],'waste-bunker':[0,0],brush:[0,0],rocks:[2,6],path:[3,4],bridge:[3,4]};
export function liveOriginalRelease(from,impact,{surfaceAt,heightAt,blocked,outOfBounds,backspin=0}) {
 const samples=[{...from,lift:0}],base=heightAt(from);
 let ball={...impact,x:0,z:0,height:0,angularOffset:0};
 const initialSurface=surfaceAt(from),initial=surfaces[initialSurface]??[1,1];
 ball.speed=Math.round(ball.speed*({sand:.4,'pot-bunker':.1,'waste-bunker':.25,brush:.3}[initialSurface]??1));
 ball={...ball,...originalBounce({...ball,bounceCoefficient:initial[1],boundaryFlags:0})};
 if(backspin>0){ball.heading=(ball.heading+0x80000000)>>>0;ball.speed=Math.round(ball.speed*.3*backspin);ball.verticalSpeed=0;}
 let previousTerrain=0;
 for(let i=0;i<600;i++){
  const previous=samples.at(-1);
  if(outOfBounds(previous)||surfaceAt(previous)==='water')return result(surfaceAt(previous)==='water');
  if(originalBallStopped(ball))return result(false);
  ball={...ball,...originalBallPositionStep(ball)};
  ball.verticalSpeed=originalGravityStep(ball);
  const next={x:from.x+ball.x/scale,z:from.z+ball.z/scale};
  // Sweep every subsegment: fast motion must not jump a narrow hazard or trunk.
  const steps=Math.max(1,Math.ceil(Math.hypot(next.x-previous.x,next.z-previous.z)/.05));
  let last=previous;
  for(let j=1;j<=steps;j++){
   const p={x:previous.x+(next.x-previous.x)*j/steps,z:previous.z+(next.z-previous.z)*j/steps};
   if(blocked(last,p)){samples.push({...last,lift:0});return result(false);}
   if(outOfBounds(p)||surfaceAt(p)==='water'){samples.push({...p,lift:0});return result(surfaceAt(p)==='water');}
   last=p;
  }
  const terrain=Math.round((heightAt(next)-base)*scale);
  const [roll,bounce]=surfaces[surfaceAt(next)]??[1,1];
  if(ball.height>1)ball=originalAirMotion(ball,previousTerrain,terrain);
  else {
   const angle=ball.heading/0x100000000*2*Math.PI,dx=Math.sin(angle),dz=-Math.cos(angle);
   const along=heightAt({x:next.x+dx*.5,z:next.z+dz*.5})-heightAt({x:next.x-dx*.5,z:next.z-dz*.5});
   const across=heightAt({x:next.x-dz*.5,z:next.z+dx*.5})-heightAt({x:next.x+dz*.5,z:next.z-dx*.5});
   // Keep resistance in the native decelerating domain on browser slopes.
   const forwardSlope=Math.max(roll-4,Math.min(roll,Math.round(-along*2)));
   const response=originalGroundResponse({...ball,terrainCode:2,originTerrainCode:2,rollCoefficient:roll,
    forwardSlope,crossSlope:Math.max(-2,Math.min(2,Math.round(across*2))),boundaryFlags:0,phaseCounter:i,seed:0});
   ball={...ball,...response,height:0};
  }
  previousTerrain=terrain;
  ball={...ball,...originalBounce({...ball,bounceCoefficient:bounce,boundaryFlags:0})};
  samples.push({...next,lift:Math.max(0,ball.height/scale)});
 }
 // Defensive finite bound for pathological terrain; the visible ball stops at
 // its last simulated point instead of freezing the game or teleporting.
 samples.at(-1).lift=0;
 return result(false);
 function result(water){const last=samples.at(-1);return {samples,end:{x:last.x,z:last.z},water,duration:Math.max(.05,(samples.length-1)*.05)};}
}
export function validateLiveRelease(r,shot){
 if(!r||!Array.isArray(r.samples)||r.samples.length<1||r.samples.length>602||
 !r.samples.every(p=>p&&[p.x,p.z,p.lift].every(Number.isFinite)&&Math.abs(p.x)<1000&&Math.abs(p.z)<1000&&p.lift>=0&&p.lift<1000)||
 r.samples[0].x!==shot.landing.x||r.samples[0].z!==shot.landing.z||r.samples[0].lift!==0||
 r.end?.x!==r.samples.at(-1).x||r.end?.z!==r.samples.at(-1).z||typeof r.water!=='boolean'||
 r.duration!==Math.max(.05,(r.samples.length-1)*.05))throw Error('Invalid live ground release.');
}
