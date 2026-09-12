import {originalAudiblePlannerEffects} from './original-audible-planner-effects.js';
import {originalCurrentWorldShotMap} from './original-world-shot-map.js';

// Construct inside plannerFor(event,currentSnapshot), once per invocation.
// Search/scoring inputs remain explicit; all map reads and completion share
// the world owned by the audible reaction adapter.
export function originalAudiblePlannerBinding(snapshot,{context,dependencies,remarkFor,mapOptionsFor}={}){
 if(!context||!dependencies||typeof remarkFor!=='function')throw Error('Original audible planner binding requires context, dependencies and a remark resolver.');
 const effects=originalAudiblePlannerEffects(snapshot,remarkFor);
 const map=originalCurrentWorldShotMap(effects.readWorld,mapOptionsFor,effects.readGeneration);
 return {context,dependencies:{...dependencies,map},effects};
}
