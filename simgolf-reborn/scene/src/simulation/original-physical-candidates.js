import {originalSharedCandidateTrial,advanceOriginalCandidateTrial,originalCandidateTrialResult} from './original-candidate-trial.js';
import {originalAssessedRouteSearch} from './original-route-search.js';
// Adapter for the route search's sequential simulator callback. All mutable
// speculative state is owned here; the caller's golfer/map remain unchanged.
export function originalPhysicalCandidates({launch,physical,map,shared}) {
 let state=structuredClone(shared);
 const shotClassAt=code=>state.shotClassOverrides.find(p=>p.code===code)?.shotClass??map.planning.shotClassAt(code);
 const terrainAt=p=>{
  const code=map.planning.terrainAt(p.x,p.z);
  return {...map.terrainAt(p),code,kind:map.planning.kindAt(code),shotClass:shotClassAt(code)};
 };
 const simulate=(request,context)=>{
  if(request.actorId!==launch.actorId)throw Error('Candidate actor does not match the search actor.');
  const q={...launch,explicitTarget:false,plannerArgument:request.x,targetZ:request.z,
   mode:request.curve,curve:request.curve,target:{...context.target},
   worldFlags:context.worldFlags,driftMode:context.mode};
  let trial=originalSharedCandidateTrial(q,state,map.planning,physical);
  const environment={...map,mode:context.mode,variant:launch.variant};
  while(trial.status==='running')trial=advanceOriginalCandidateTrial(trial,environment,256);
  state=originalCandidateTrialResult(trial);
  return {landing:state.landing?{...state.landing}:null};
 };
 return {simulate,terrainAt,shotClassAt,sharedState:()=>structuredClone(state)};
}

export function originalPhysicalRouteSearch(q,{launch,physical,map,shared}) {
 if(launch.actorId!==q.actorId||launch.x!==q.origin.x||launch.z!==q.origin.z)
  throw Error('Candidate launch and search must refer to the same golfer position.');
 const candidates=originalPhysicalCandidates({launch,physical:{...physical,skillMask:q.skillMask},map,shared});
 const result=originalAssessedRouteSearch({...q,terrainAt:candidates.terrainAt,
  shotClassAt:candidates.shotClassAt},candidates.simulate);
 return {...result,shared:candidates.sharedState()};
}
