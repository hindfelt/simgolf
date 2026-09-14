import {originalPlannerSetup} from './original-planner-setup.js';
import {originalResolvedShot} from './original-resolved-shot.js';
// Entry-to-launch exact-point path. State patches are returned for the owning
// simulation to persist; their effects are already applied to this shot.
export function originalExactPlanner(q,cache,map) {
 if(!Number.isInteger(q.plannerArgument)||q.plannerArgument===-1)throw Error('Exact planner requires an exact target coordinate.');
 const setup=originalPlannerSetup(q,map);
 const classes=new Map(setup.shotClassOverrides.map(p=>[p.code,p.shotClass]));
 const effectiveMap={...map,shotClassAt:code=>classes.has(code)?classes.get(code):map.shotClassAt(code)};
 return {...originalResolvedShot({...q,range:setup.range},cache,effectiveMap),setup};
}
