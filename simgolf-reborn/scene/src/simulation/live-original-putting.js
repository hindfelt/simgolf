import {originalFlatPuttStart,originalFlatPuttStep} from './original-flat-putt.js';
import {originalStrengthCache,originalStrengthSearch} from './original-strength-search.js';
import {originalRandom} from './original-rng.js';
import {originalPuttingAim,originalPuttingWindow} from './original-putting.js';
import {originalHeading} from './original-heading.js';
import {RULES} from './rules.js';
const centre=20*1024+512,scale=RULES.yardsPerUnit*1024/25;
// A translated local flat-green frame preserves native units per yard. It does
// not reinterpret the playable 45x72 map as the original 50x50 world.
export function startLiveOriginalPutt(g,v,cup,{lie,height,skill,blocked=()=>false}){
 const from=v.ball,level=height(g,from.x,from.z),d=Math.hypot(cup.x-from.x,cup.z-from.z);
 if(d>12)return null;
 for(let t=0;t<=1;t+=.1)for(const side of [-.35,0,.35]){
  const x=from.x+(cup.x-from.x)*t+side,z=from.z+(cup.z-from.z)*t+side;
  if(blocked(from,{x,z})||lie(g,{x,z})!=='green'||Math.abs(height(g,x,z)-level)>.001)return null;
 }
 // Current profile policy is explicit; packed retail flag/attitude mapping is
 // still separate. Neutral attitude is deliberate: fee happiness is not the
 // original attitude byte. The deviation, velocity and roll arithmetic is native.
 const puttingSkill=Math.round(Math.max(0,Math.min(1,skill))*8);
 const aim=originalPuttingAim({distanceYards:Math.round(d*RULES.yardsPerUnit),windowBeforeGreen:originalPuttingWindow({stateFlags:0,adjustmentLevel:0,golferFlags:0,golferType:0,skillFlags:puttingSkill?16:0,puttingSkill}),attitude:0,seed:g.rng});
 // Use the recovered ring cache across golfers and saves. Airborne launch
 // searches share it in liveFlightVersion 1; full retail launch order is pending.
 const strength=originalStrengthSearch({distance:Math.round(d*RULES.yardsPerUnit)+2,verticalSpeed:0,mode:1,rollCoefficient:3},g.liveStrengthCache??originalStrengthCache());
 g.liveStrengthCache=strength.cache;
 const rng=originalRandom(aim.rngState),bound=Math.trunc(strength.speed/8);
 const draw=rng.next(Math.max(1,bound));
 const launch={speed:strength.speed+Math.trunc(strength.speed/12)-(bound?draw:0)};
 g.rng=rng.state;
 const x=centre+Math.round((from.x-cup.x)*scale),z=centre+Math.round((from.z-cup.z)*scale);
 return {cup:{x:cup.x,z:cup.z},level,elapsed:0,state:originalFlatPuttStart({x,z,height:0,verticalSpeed:0,club:13,heading:originalHeading(centre-x,centre-z),angularOffset:aim.angularOffset,speed:launch.speed,seed:g.rng},{cupX:20,cupZ:20,eventFlag:!!v.pro})};
}
export function stepLiveOriginalPutt(g,shot,dt,{lie,height,blocked=()=>false}){
 const p=shot.nativePutt;p.elapsed+=dt;
 let point={x:p.cup.x+(p.state.ball.x-centre)/scale,z:p.cup.z+(p.state.ball.z-centre)/scale};
 while(p.elapsed>=.05-1e-9&&p.state.status==='rolling'){
  p.elapsed=Math.max(0,p.elapsed-.05);
  const result=originalFlatPuttStep(p.state,{phaseCounter:Math.round((g.time-p.elapsed)*20)>>>0,seed:g.rng});g.rng=result.rngState;
  const next={x:p.cup.x+(result.state.ball.x-centre)/scale,z:p.cup.z+(result.state.ball.z-centre)/scale};
  if(blocked(point,next)||lie(g,next)!=='green'||Math.abs(height(g,next.x,next.z)-p.level)>.001){p.state.status='stopped';p.state.ball.speed=0;break;}
  p.state=result.state;point=next;
 }
 if(p.state.status==='captured')point={...p.cup};
 return {point,done:p.state.status!=='rolling'};
}
export function validateLiveOriginalPutt(p){
 if(!p||![p.cup?.x,p.cup?.z,p.level,p.elapsed].every(Number.isFinite)||p.elapsed<0||p.elapsed>.051||!p.state||p.state.version!==1||!['rolling','stopped','captured'].includes(p.state.status)||!Number.isInteger(p.state.steps)||p.state.steps<0||p.state.steps>10000)throw Error('Invalid live putt.');
 const b=p.state.ball;if(!b||![b.x,b.z,b.height,b.speed,b.verticalSpeed,b.heading,b.angularOffset,b.seed].every(Number.isInteger)||b.speed<0||b.speed>100000||b.height!==0||b.verticalSpeed!==0||b.heading<0||b.heading>0xffffffff||b.seed<0||b.seed>0xffffffff||b.angularOffset< -2147483648||b.angularOffset>2147483647||b.x<0||b.x>51200||b.z<0||b.z>51200||Math.abs(p.cup.x)>1000||Math.abs(p.cup.z)>1000||p.state.cupX!==20||p.state.cupZ!==20||p.state.rollCoefficient!==3||typeof p.state.eventFlag!=='boolean')throw Error('Invalid live putt state.');
}

export function validateLiveStrengthCache(c){
 if(!c||!Number.isInteger(c.next)||c.next<0||c.next>=10||!Array.isArray(c.entries)||c.entries.length!==10||!c.entries.every(e=>e&&Number.isInteger(e.distance)&&e.distance>=0&&e.distance<=330&&Number.isInteger(e.verticalSpeed)&&e.verticalSpeed>=0&&e.verticalSpeed<=100000&&Number.isInteger(e.speed)&&e.speed>=0&&e.speed<=100000))throw Error('Invalid live strength cache.');
}
