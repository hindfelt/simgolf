import {originalLaunchPreparation} from './original-launch-preparation.js';
import {originalAutoPreparedLaunch} from './original-auto-prepared-launch.js';
import {originalTargetSelection} from './original-target-selection.js';
import {originalPlannerSetup} from './original-planner-setup.js';
// From an already selected target/range through automatic launch restoration.
// Planning settings are separate from current actor/shared state; the latter
// supplies mutable fields so stale planning copies cannot replace them.
export function originalAssessedAutomaticLaunch(q,map,effects) {
 const actor=q.state.actor;
 const planning={...q.planning,actorId:q.actorId,seed:q.state.seed,
  target:actor.target,actorFlags:actor.actorFlags,actorClass:actor.actorClass,
  skillMask:actor.skillMask,shotCounter:actor.shotCounter};
 if(planning.plannerArgument!==-1)throw Error('Automatic launch requires the original automatic planner sentinel.');
 const prepared=originalLaunchPreparation(planning,q.state.cache,map);
 const origin={x:planning.x>>10,z:planning.z>>10};
 const result=originalAutoPreparedLaunch({...q,origin,heading:planning.heading,
  originFlags:map.marksAt(origin.x,origin.z),mode:Number(planning.explicitTarget),
  driftMode:planning.driftMode,activeActor:planning.activeActor,conditionLevel:planning.level,
  variant:planning.variant,stateFlags:planning.globalFlags},prepared,map,effects);
 const {randomDraws,...rest}=result;
 // This instrumentation counts the automatic middle/tail only. The final
 // seed, however, includes preparation and every later stage's random draws.
 return {...rest,postPreparationDraws:randomDraws};
}

// Start at target geometry for direct/short automatic shots. Long targets
// require the physical route search before they can enter assessed launch.
export function originalDirectAutomaticLaunch(q,map,effects) {
 if(q.planning.plannerArgument!==-1)throw Error('Automatic launch requires the original automatic planner sentinel.');
 const actor=q.state.actor;
 const selected=originalTargetSelection({...q.planning,target:actor.target,
  actorFlags:actor.actorFlags,skillMask:actor.skillMask,
  terrainCode:map.terrainAt(q.planning.x>>10,q.planning.z>>10),
  landing:q.state.landing,diagnostics:q.state.diagnostics},map);
 if(selected.request.path==='search')throw Error('Long automatic target requires physical route search.');
 return originalAssessedAutomaticLaunch({...q,
  planning:{...q.planning,distance:selected.distance,heading:selected.heading,curve:selected.curve},
  state:{...q.state,landing:selected.landing,diagnostics:selected.diagnostics,
   actor:{...actor,target:selected.target,actorFlags:selected.actorFlags}}},map,effects);
}

// Original entry range query precedes temporary terrain-class overrides.
export function originalDirectAutomaticPlanner(q,map,effects) {
 if(q.planning.plannerArgument!==-1)throw Error('Automatic launch requires the original automatic planner sentinel.');
 const actor=q.state.actor;
 const planning={...q.planning,actorId:q.actorId,actorFlags:actor.actorFlags,
  rangeInput:{...q.planning.rangeInput,skillMask:actor.skillMask,
   shot:actor.shotCounter,professional:actor.actorClass!==0}};
 const setup=originalPlannerSetup(planning,map);
 const classes=new Map(setup.shotClassOverrides.map(p=>[p.code,p.shotClass]));
 const effectiveMap={...map,shotClassAt:code=>classes.has(code)?classes.get(code):map.shotClassAt(code)};
 return {...originalDirectAutomaticLaunch({...q,planning:{...planning,range:setup.range}},effectiveMap,effects),setup};
}
