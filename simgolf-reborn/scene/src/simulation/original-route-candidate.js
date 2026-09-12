import {originalMapDistance} from './original-route-distance.js';
// Candidate admission at 0x42290e–0x422af8. This is the first filter, not
// the subsequent six-way shot simulation, scoring, or winning-candidate choice.
export function originalRouteCandidate({candidate,start,cup,previousTarget,actorFlags,
 range,shotDistance,cupDistance,terrainAt}) {
 const point=p=>p&&[p.x,p.z].every(Number.isInteger);
 if(![candidate,start,cup,previousTarget].every(point)||!Number.isInteger(actorFlags)||
   ![range,shotDistance,cupDistance].every(n=>Number.isInteger(n)&&n>=0&&n<=2000)||typeof terrainAt!=='function')
   throw Error('Invalid original route candidate inputs.');
 const same=(a,b)=>a.x===b.x&&a.z===b.z;
 const reject=reason=>({eligible:false,reason});
 if((actorFlags&1)&&same(candidate,previousTarget))return reject('previous-target');
 if(candidate.x<0||candidate.x>=50||candidate.z<0||candidate.z>=50)return reject('outside-map');
 const terrain=terrainAt({...candidate});
 if(!terrain||!Number.isInteger(terrain.code)||!Number.isInteger(terrain.shotClass))throw Error('Invalid original route terrain.');
 if(terrain.code===20)return reject('excluded-terrain');
 if(shotDistance>range+16)return reject('beyond-range');
 if(shotDistance<Math.trunc(range/3)&&shotDistance<Math.trunc(cupDistance/3)&&!(actorFlags&1))return reject('too-short');
 if(same(candidate,start))return reject('current-tile');
 if(terrain.code===0||terrain.shotClass>1)return reject('unsuitable-terrain');
 let supported=terrain.shotClass!==1;
 if(!supported)for(const d of [{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}]) {
   const neighbor=terrainAt({x:candidate.x+d.x,z:candidate.z+d.z});
   if(!neighbor||!Number.isInteger(neighbor.shotClass))throw Error('Invalid original route neighbor.');
   if(neighbor.shotClass<=0)supported=true;
 }
 const remaining=originalMapDistance(candidate.x-cup.x,candidate.z-cup.z);
 const initial=originalMapDistance(start.x-cup.x,start.z-cup.z);
 if(terrain.code===1&&remaining>3)return reject('distant-green');
 if(remaining+(supported?1:Math.trunc(initial/2))>initial)return reject('insufficient-progress');
 return {eligible:true,supported,remaining,initial};
}
