import {originalAssessedAutomaticLaunch} from './original-assessed-automatic-launch.js';

// Resume after originalPhysicalTargetSearch. Candidate simulation advances
// shared RNG/cache and changes terrain metadata even though the golfer is
// restored after each trial. These changes must reach the final launch.
export function originalSearchedAutomaticLaunch(q,searched,map,effects) {
 const {result,aim,shared,search}=searched;
 const classes=new Map(shared.shotClassOverrides.map(p=>[p.code,p.shotClass]));
 const effectiveMap={...map,shotClassAt:code=>classes.has(code)?classes.get(code):map.shotClassAt(code)};
 return originalAssessedAutomaticLaunch({...q,followupFlag:search.searchFlag,
  planning:{...q.planning,explicitTarget:false,distance:aim.distance,
   heading:aim.heading,curve:result.curve,worldFlags:result.worldFlags,driftMode:result.mode},
  state:{...q.state,seed:shared.seed,cache:structuredClone(shared.cache),
   diagnostics:result.diagnostics,landing:{...search.winner.landing},
   actor:{...q.state.actor,target:{...result.target},actorFlags:aim.actorFlags}}},effectiveMap,effects);
}
