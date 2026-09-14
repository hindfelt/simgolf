import {originalObstacleHeight} from './original-obstacle-height.js';
import {originalMapDistance} from './original-route-distance.js';
import {originalRandom} from './original-rng.js';
// 0x421e4d–0x421f43, after original obstacle-height test 0x406e80.
export function originalCandidateAirCollision({position,oldTile,speed,heading,flags,
 mode,obstructed,professional,abilityFlags,luck,seed}) {
 if(!position||![position.x,position.z].every(n=>Number.isInteger(n)&&n>=0&&n<51200)||
   !oldTile||![oldTile.x,oldTile.z].every(n=>Number.isInteger(n)&&n>=0&&n<50)||
   !Number.isInteger(speed)||speed< -2147483648||speed>2147483647||!Number.isInteger(heading)||heading<0||heading>0xffffffff||
   !Number.isInteger(flags)||flags<0||flags>0xffffffff||!Number.isInteger(mode)||
   typeof obstructed!=='boolean'||typeof professional!=='boolean'||!Number.isInteger(abilityFlags)||
   !Number.isInteger(luck)||luck<0||luck>255)throw Error('Invalid original airborne collision.');
 const rng=originalRandom(seed);
 let hit=false;
 if(mode!==2&&obstructed) {
   let distance=originalMapDistance(position.x-oldTile.x*1024-512,position.z-oldTile.z*1024-512);
   if(professional&&(abilityFlags&0x200))distance=(distance+Math.trunc(Math.imul(luck,distance)/4))|0;
   if(distance<rng.next(768)) {
     heading=(heading+((64+rng.next(128))<<24))>>>0;
     // Original RNG truncates its bound to uint16; zero still consumes a draw.
     speed=(speed-rng.next(Math.max(1,speed&0xffff)))|0;
     flags=(flags|2)>>>0;hit=true;
   }
 }
 return {speed,heading,flags,seed:rng.state,draws:rng.draws,hit};
}

// The original detector runs before the mode-2 bypass, so even design mode
// must preserve any random draw used to determine obstacle height.
export function originalCandidateAirObstacle(input) {
 const detection=originalObstacleHeight(input);
 const collision=originalCandidateAirCollision({...input,seed:detection.seed,obstructed:detection.obstructed});
 return {...collision,obstructed:detection.obstructed,draws:detection.draws+collision.draws};
}
