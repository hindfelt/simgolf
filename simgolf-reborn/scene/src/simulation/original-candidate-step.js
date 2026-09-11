import {originalBallPositionStep} from './original-ball-position.js';
import {originalBallStopped} from './original-ground-motion.js';
import {originalCandidateMotion} from './original-candidate-motion.js';
import {originalCandidateGround} from './original-candidate-ground.js';
import {originalCandidateBounce} from './original-candidate-bounce.js';
import {originalCandidateImpact} from './original-candidate-impact.js';
import {originalCandidateAirObstacle} from './original-candidate-air-collision.js';
// Candidate simulator 0x421b50 orchestration after launch selection. Map
// callbacks must supply original terrain/height/slope data, not browser guesses.
export function originalCandidateStart(launch) {
 if(!Number.isInteger(launch.angularOffset))throw Error('Invalid original candidate launch.');
 return {...launch,angularOffset:Math.trunc(launch.angularOffset/2),steps:0,randomDraws:0,landing:null};
}
export function originalCandidateStep(state,{terrainAt,heightAt,slopeAt,mode,variant}) {
 if(![terrainAt,heightAt,slopeAt].every(f=>typeof f==='function'))throw Error('Original candidate requires map callbacks.');
 if(state.speed===0)return {...state};
 const oldTile={x:state.x>>10,z:state.z>>10},old=terrainAt(oldTile);
 const groundBefore=heightAt({x:state.x,z:state.z});
 const position=originalBallPositionStep(state);
 const groundAfter=position.height>1?heightAt({x:position.x,z:position.z}):groundBefore;
 let next=originalCandidateMotion(state,{groundBefore,groundAfter});
 const subX=(next.x>>6)&15,subZ=(next.z>>6)&15;
 let boundaryFlags=0;
 for(const [test,x,z] of [[subX<=1,-1,0],[subZ<=1,0,-1],[subX>=14,1,0],[subZ>=14,0,1]])
   if(test&&terrainAt({x:oldTile.x+x,z:oldTile.z+z}).code!==old.code)boundaryFlags=1;
 const facing=(((state.heading>>>28)+1)>>1)&7;
 const slope=direction=>slopeAt({x:next.x,z:next.z},direction);
 let draws=0;
 if(next.airborne) {
   const collision=originalCandidateAirObstacle({...next,position:{x:next.x,z:next.z},oldTile,
     terrainCode:old.code,terrainFlags:old.flags,mode,variant});
   draws+=collision.draws;
   next={...next,speed:collision.speed,heading:collision.heading,flags:collision.flags,seed:collision.seed};
 } else {
   const ground=originalCandidateGround({...next,rollCoefficient:old.rollCoefficient,
     forwardSlope:state.skillMask&4?slope(facing):0,crossSlope:slope((facing+2)&7),
     terrainCode:old.code,boundaryFlags,subX,subZ,
     crossedX:oldTile.x!==(next.x>>10),crossedZ:oldTile.z!==(next.z>>10),
     stepX:(next.x-state.x)|0,stepCosine:(state.z-next.z)|0,wallFlags:old.wallFlags});
   next={...next,speed:ground.speed,heading:ground.heading};
 }
 if(next.height<=0&&next.verticalSpeed<0) {
   const bounce=originalCandidateBounce({...next,bounceCoefficient:old.bounceCoefficient,
     terrainFlags:old.flags,mode,boundaryFlags,subX,subZ});
   next={...next,height:bounce.height,verticalSpeed:bounce.verticalSpeed};
   const impact=originalCandidateImpact({...next,facing,terrainCode:old.code,
     terrainFlags:old.flags,mode,boundaryFlags,centre:bounce.centre,slopeAt:slope});
   draws+=impact.draws;
   next={...next,speed:impact.speed,heading:impact.heading,verticalSpeed:impact.verticalSpeed,flags:impact.flags,seed:impact.seed};
 }
 if(originalBallStopped(next)){next.speed=0;next.landing={x:next.x,z:next.z};}
 return {...next,steps:(state.steps??0)+1,randomDraws:(state.randomDraws??0)+draws};
}
