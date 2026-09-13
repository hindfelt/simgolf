import {originalLaunchBase} from './original-launch-base.js';
import {originalStrengthCache,originalStrengthSearch} from './original-strength-search.js';
import {originalBallPositionStep} from './original-ball-position.js';
import {originalGravityStep} from './original-bounce.js';
import {originalAirMotion} from './original-air-phase.js';
import {originalHeading} from './original-heading.js';
import {RULES} from './rules.js';
const scale=RULES.yardsPerUnit*1024/25;
export const FLIGHT_TICK=.05;
// Live-world binding: native fixed units per yard, with browser terrain height
// expressed in the same render units as horizontal distance. Launch accuracy,
// tree impacts and ground release remain browser policies. Straight shots only.
export function liveOriginalFlight(g,from,aim,carry,range,surface,height,target=aim) {
 const yards=Math.max(1,Math.min(330,Math.round(carry*RULES.yardsPerUnit)));
 const launch=originalLaunchBase({distance:yards,range:Math.max(1,Math.min(330,Math.round(range*RULES.yardsPerUnit))),terrainCode:surface==='tee'?0:2,
  explicitTarget:false,mode:0,actorFlags:1},g.liveStrengthCache??originalStrengthCache());
 // The browser planner supplies carry, not total native shot distance. Search
 // that full carry with the recovered solver instead of retaining launch-base's
 // 80% air / remaining native release assumption beside browser ground roll.
 const air=originalStrengthSearch({distance:yards,verticalSpeed:launch.verticalSpeed,mode:0},launch.cache);
 // Keep the browser accuracy deviation at full angular precision. Feeding a
 // small deviation through the coarse base-heading lookup erased training.
 const baseHeading=originalHeading(Math.round((target.x-from.x)*scale),Math.round((target.z-from.z)*scale));
 const error=Math.atan2(aim.x-from.x,from.z-aim.z)-Math.atan2(target.x-from.x,from.z-target.z);
 const heading=(baseHeading+Math.round(error*0x100000000/(2*Math.PI)))>>>0;
 let ball={x:0,z:0,height:0,speed:air.speed,verticalSpeed:launch.verticalSpeed,
  heading,angularOffset:0};
 const base=height(g,from.x,from.z),samples=[{...from,lift:0}];
 let previousTerrainHeight=0;
 for(let i=0;i<1000;i++) {
  ball={...ball,...originalBallPositionStep(ball)};
  ball.verticalSpeed=originalGravityStep(ball);
  const x=from.x+ball.x/scale,z=from.z+ball.z/scale;
  const terrainHeight=Math.round((height(g,x,z)-base)*scale);
  ball=originalAirMotion(ball,previousTerrainHeight,terrainHeight);
  previousTerrainHeight=terrainHeight;
  samples.push({x,z,lift:Math.max(0,ball.height/scale)});
  if(ball.height<=0){
   g.liveStrengthCache=air.cache;
   return {samples,club:launch.club,duration:(samples.length-1)*FLIGHT_TICK};
  }
 }
 throw Error('Recovered flight did not land within its motion bound.');
}
export function validateLiveFlight(f,shot) {
 if(!f||!Array.isArray(f.samples)||f.samples.length<2||f.samples.length>1001||
  !f.samples.every(p=>p&&[p.x,p.z,p.lift].every(Number.isFinite)&&Math.abs(p.x)<1000&&Math.abs(p.z)<1000&&p.lift>=0&&p.lift<1000)||
  f.samples[0].x!==shot.from.x||f.samples[0].z!==shot.from.z||f.samples[0].lift!==0||
  f.samples.at(-1).x!==shot.landing.x||f.samples.at(-1).z!==shot.landing.z||f.samples.at(-1).lift!==0||
  shot.duration!==(f.samples.length-1)*FLIGHT_TICK)throw Error('Invalid live flight.');
}
