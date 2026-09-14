import {originalPlannerSetup} from './original-planner-setup.js';
import {originalTargetSelection} from './original-target-selection.js';
import {originalAssessedAutomaticLaunch} from './original-assessed-automatic-launch.js';
import {originalPhysicalTargetSearch} from './original-physical-candidates.js';
import {originalSearchedAutomaticLaunch} from './original-searched-automatic-launch.js';

// One owner for entry, target choice, optional physical search and launch.
// map.planning also supplies social/object reads used by automatic reactions.
// searchState contains original search scratch state plus candidateLanding;
// scoreAt reads the separate caller spatial-score buffer. Both remain explicit.
export function originalAutomaticPlanner(q,{map,physical,searchState,score,scoreAt},effects) {
 if(q.planning.plannerArgument!==-1)throw Error('Automatic launch requires the original automatic planner sentinel.');
 const actor=q.state.actor;
 const planning={...q.planning,actorId:q.actorId,actorFlags:actor.actorFlags,
  actorClass:actor.actorClass,skillMask:actor.skillMask,shotCounter:actor.shotCounter,
  seed:q.state.seed,target:actor.target,recoveryValue:actor.recoveryValue,
  rangeInput:{...q.planning.rangeInput,abilityFlags:q.planning.abilityFlags,skillMask:actor.skillMask,
   shot:actor.shotCounter,professional:actor.actorClass!==0}};
 const setup=originalPlannerSetup(planning,map.planning);
 const overrides=new Map(setup.shotClassOverrides.map(p=>[p.code,p.shotClass]));
 const planningMap={...map.planning,shotClassAt:code=>overrides.has(code)?overrides.get(code):map.planning.shotClassAt(code)};
 planning.range=setup.range;
 const selected=originalTargetSelection({...planning,terrainCode:setup.terrainCode,
  landing:q.state.landing,diagnostics:q.state.diagnostics},planningMap);
 const prepared={...q,planning:{...planning,heading:selected.heading,distance:selected.distance,curve:selected.curve},
  state:{...q.state,landing:selected.landing,diagnostics:selected.diagnostics,
   actor:{...actor,target:selected.target,actorFlags:selected.actorFlags}}};
 if(selected.request.path!=='search')
  return {...originalAssessedAutomaticLaunch(prepared,planningMap,effects),setup,searched:null};
 if(!searchState||!physical)throw Error('Long automatic shots require physical search state.');
 const origin={x:planning.x,z:planning.z};
 const searchInput={...searchState,actorId:q.actorId,origin,cup:planning.cup,
  previousTarget:selected.target,actorFlags:selected.actorFlags,actorClass:actor.actorClass,
  skillMask:actor.skillMask,shotCounter:actor.shotCounter,abilityFlags:planning.abilityFlags,
  hole:actor.hole,level:planning.level,
  rangeInput:planning.rangeInput,worldFlags:planning.worldFlags,mode:planning.driftMode,
  diagnostics:q.state.diagnostics};
 const searched=originalPhysicalTargetSearch(searchInput,{
  launch:{...prepared.planning,stateFlags:planning.globalFlags,actorFlags:selected.actorFlags,target:selected.target},
  physical:{...physical,professional:actor.actorClass!==0,abilityFlags:planning.abilityFlags},
  map:{...map,planning:planningMap},shared:{seed:q.state.seed,cache:q.state.cache,
   landing:searchState.candidateLanding,shotClassOverrides:setup.shotClassOverrides}}, {score,scoreAt});
 return {...originalSearchedAutomaticLaunch(prepared,searched,planningMap,effects),setup,searched};
}
