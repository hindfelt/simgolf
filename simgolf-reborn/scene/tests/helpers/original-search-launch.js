import {originalPhysicalTargetSearch} from '../../src/simulation/original-physical-candidates.js';
import {originalSearchedAutomaticLaunch} from '../../src/simulation/original-searched-automatic-launch.js';
import {originalShotMap} from '../../src/simulation/original-shot-map.js';
import {originalStrengthCache} from '../../src/simulation/original-strength-search.js';
// Same controlled flat map and social records as the chained native oracle.
export function searchLaunchMap(q){
 const metadata=new Map(q.cells.map(c=>[c[2],{shotClass:c[3],kind:c[2]===3?13:0}]));
 if(!metadata.has(20))metadata.set(20,{shotClass:q.excludedClass,kind:0});
 const map=originalShotMap({terrain:Uint8Array.from(q.cells.map(c=>c[2])),marks:Uint16Array.from(q.cells.map(c=>c[4])),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)},readHeight:()=>0,globalFlags:0,readRawTerrain:()=>0,metadata:code=>({...metadata.get(code),flags:0,bounceCoefficient:3,rollCoefficient:0})});
 return {...map,planning:{...map.planning,categoryAt:()=>0,holeRecordAt:()=>0,profileHoleMarkAt:()=>0,profileIndexFor:()=>0,profileByteAt:()=>0}};
}
export function runSearchLaunch(q){
 const map=searchLaunchMap(q);
 const shared={seed:q.seed,landing:q.landing,cache:originalStrengthCache(),shotClassOverrides:[]};
 const searched=originalPhysicalTargetSearch(q,{launch:q.launch,physical:{professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5},map,shared},{score:q.aimScore,scoreAt:(x,z)=>q.aimScores[x*50+z]});
 const planningMap={...map.planning,categoryAt:()=>0,holeRecordAt:()=>0,profileHoleMarkAt:()=>0,profileIndexFor:()=>0,profileByteAt:()=>0};
 const launch=originalSearchedAutomaticLaunch(q.automatic,searched,planningMap,{emit:(_event,state)=>state});
 return {searched,launch};
}
