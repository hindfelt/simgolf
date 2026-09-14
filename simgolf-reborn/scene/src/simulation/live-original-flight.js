import {originalLaunchBase} from './original-launch-base.js';
import {originalStrengthCache,originalStrengthSearch} from './original-strength-search.js';
import {originalBallPositionStep} from './original-ball-position.js';
import {originalGravityStep} from './original-bounce.js';
import {originalAirMotion} from './original-air-phase.js';
import {originalHeading} from './original-heading.js';
import {originalShotShape} from './original-shot-shape.js';
import {RULES} from './rules.js';
const scale=RULES.yardsPerUnit*1024/25;
export const FLIGHT_TICK=.05;
// Live-world binding: native fixed units per yard, with browser terrain height
// expressed in the same render units as horizontal distance. Launch accuracy,
// tree impacts remain live-world policies. Version two also binds shot shapes
// and passes impact velocity to the recovered ground arithmetic.
export function liveOriginalFlight(g,from,aim,carry,range,surface,height,target=aim,technique='straight',skill=1) {
 const yards=Math.max(1,Math.min(330,Math.round(carry*RULES.yardsPerUnit)));
 const launch=originalLaunchBase({distance:yards,range:Math.max(1,Math.min(330,Math.round(range*RULES.yardsPerUnit))),terrainCode:surface==='tee'?0:2,
  explicitTarget:false,mode:0,actorFlags:1},g.liveStrengthCache??originalStrengthCache());
 // Version one pairs full carry with legacy ground roll. Version two keeps
 // the recovered 80% air allocation because impact velocity now drives release.
 const verticalSpeed=g.liveFlightVersion===2?Math.round(launch.verticalSpeed*(technique==='punch'?.5:technique==='backspin'?1.35:1)):launch.verticalSpeed;
 const air=originalStrengthSearch({distance:g.liveFlightVersion===2?Math.trunc(yards*4/5):yards,verticalSpeed,mode:0},launch.cache);
 // Keep the browser accuracy deviation at full angular precision. Feeding a
 // small deviation through the coarse base-heading lookup erased training.
 const baseHeading=originalHeading(Math.round((target.x-from.x)*scale),Math.round((target.z-from.z)*scale));
 const error=Math.atan2(aim.x-from.x,from.z-aim.z)-Math.atan2(target.x-from.x,from.z-target.z);
 const errorHeading=Math.round(error*0x100000000/(2*Math.PI));
 const heading=(baseHeading+(g.liveFlightVersion===2?0:errorHeading))>>>0;
 const targetLength=Math.hypot(target.x-from.x,target.z-from.z)||1;
 const accuracy={x:aim.x-from.x-(target.x-from.x)*carry/targetLength,
  z:aim.z-from.z-(target.z-from.z)*carry/targetLength};
 let ball={x:0,z:0,height:0,speed:air.speed,verticalSpeed,heading,angularOffset:0};
 if(g.liveFlightVersion===2&&(technique==='draw'||technique==='fade')) {
  const curve=technique==='draw'?1:-1;
  const shaped=originalShotShape({...ball,referenceSpeed:air.speed,strength:yards,curve,actorFlags:0,activeActor:true,shotType:0});
  // Skill weighting is the live profile policy; the heading, speed boost and
  // per-tick curvature arithmetic come from the recovered shape/motion code.
  const weight=.3+.7*Math.max(0,Math.min(1,skill));
  ball={...ball,heading:(heading+Math.round(curve*0x15555554*weight))>>>0,
   angularOffset:Math.round(shaped.curveOffset*weight),speed:shaped.speed};
 }
 const base=height(g,from.x,from.z),samples=[{...from,lift:0}];
 let previousTerrainHeight=0;
 for(let i=0;i<1000;i++) {
  ball={...ball,...originalBallPositionStep(ball)};
  ball.verticalSpeed=originalGravityStep(ball);
  // Native per-tick integer truncation can erase the difference between two
  // live accuracy levels. Preserve the browser dispersion in subcell space,
  // independently of the recovered base flight and shape integration.
  const progress=g.liveFlightVersion===2?Math.min(1,Math.hypot(ball.x,ball.z)/scale/Math.max(.001,carry)):0;
  const x=from.x+ball.x/scale+accuracy.x*progress,z=from.z+ball.z/scale+accuracy.z*progress;
  const terrainHeight=Math.round((height(g,x,z)-base)*scale);
  ball=originalAirMotion(ball,previousTerrainHeight,terrainHeight);
  previousTerrainHeight=terrainHeight;
  samples.push({x,z,lift:Math.max(0,ball.height/scale)});
  if(ball.height<=0){
   g.liveStrengthCache=air.cache;
   return {samples,...(g.liveFlightVersion===2?{impact:{...ball,height:0,heading:(ball.heading+errorHeading)>>>0}}:{}),club:launch.club,duration:(samples.length-1)*FLIGHT_TICK};
  }
 }
 throw Error('Recovered flight did not land within its motion bound.');
}
export function validateLiveFlight(f,shot) {
 if(f?.impact&&(!['x','z','height','speed','verticalSpeed','heading','angularOffset'].every(k=>Number.isInteger(f.impact[k]))||f.impact.height!==0||f.impact.speed<0||f.impact.speed>100000||f.impact.heading<0||f.impact.heading>0xffffffff))throw Error('Invalid live flight impact.');
 if(!f||!Array.isArray(f.samples)||f.samples.length<2||f.samples.length>1001||
  !f.samples.every(p=>p&&[p.x,p.z,p.lift].every(Number.isFinite)&&Math.abs(p.x)<1000&&Math.abs(p.z)<1000&&p.lift>=0&&p.lift<1000)||
  f.samples[0].x!==shot.from.x||f.samples[0].z!==shot.from.z||f.samples[0].lift!==0||
  f.samples.at(-1).x!==shot.landing.x||f.samples.at(-1).z!==shot.landing.z||f.samples.at(-1).lift!==0||
  shot.duration!==(f.samples.length-1)*FLIGHT_TICK)throw Error('Invalid live flight.');
}
