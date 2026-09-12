import {originalObstacleHeight} from './original-obstacle-height.js';
import {originalRandom} from './original-rng.js';
const int=n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;
// 0x42bf91–0x42c135. Ball has already moved and received gravity.
// Heights are original physics-height samples, before and after movement.
// Bounce/hazard/stop processing follows this phase in the caller.
export function originalAirPhase({ball,previousTerrainHeight,terrainHeight,cellX,cellZ,
 terrainCode,terrainFlags,variant,stateFlags,skillEnabled,skillMask,luck,seed}) {
 if(![ball.height,ball.speed,ball.x,ball.z,ball.angularOffset,previousTerrainHeight,terrainHeight,cellX,cellZ].every(int)||ball.height<=1||ball.speed<0||
  ![ball.heading,stateFlags].every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff)||
  typeof skillEnabled!=='boolean'||!Number.isInteger(skillMask)||skillMask<0||skillMask>65535||
  !Number.isInteger(luck)||luck<0||luck>255)throw Error('Invalid original airborne phase.');
 let next={...ball,height:(ball.height+((previousTerrainHeight-terrainHeight)|0))|0,
  speed:(ball.speed-Math.trunc((ball.speed>>4)/2))|0,
  heading:(ball.heading+Math.trunc(ball.angularOffset/2))>>>0};
 const obstacle=originalObstacleHeight({terrainCode,height:next.height,variant,terrainFlags,seed});
 const rng=originalRandom(obstacle.seed);
 let hit=false,sound=null;
 if(obstacle.obstructed&&!(stateFlags&2)) {
  const dx=(next.x-(cellX<<10)-512)|0,dz=(next.z-(cellZ<<10)-512)|0;
  if(Math.abs(dx)>16384||Math.abs(dz)>16384)throw Error('Airborne obstacle sample outside recovered distance domain.');
  let distance=Math.trunc(Math.sqrt(dx*dx+dz*dz));
  if(skillEnabled&&(skillMask&0x200))distance=(distance+Math.trunc(Math.imul(luck,distance)/4))|0;
  if(distance<rng.next(384)) {
   next.heading=(next.heading+((rng.next(128)+64)<<24))>>>0;
   // Native bounded RNG masks its argument to 16 bits, including bound zero.
   const bound=next.speed&65535,draw=rng.next(Math.max(1,bound));
   next.speed=(next.speed-(bound?draw:0))|0;
   sound=6+rng.next(3);stateFlags=(stateFlags|2)>>>0;hit=true;
  }
 }
 next.seed=rng.state;
 return {ball:next,stateFlags,hit,sound,rngState:rng.state,draws:obstacle.draws+rng.draws};
}
