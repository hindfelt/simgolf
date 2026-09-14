import {originalTargetGeometry} from './original-target-geometry.js';
import {originalAssessedLaunch} from './original-assessed-launch.js';
// Exact-point shot: original target setup through launch, after range lookup.
// Automatic tile-target search (-1) still needs the original middle branches.
export function originalResolvedShot(q,cache,map) {
 if(!Number.isInteger(q.plannerArgument)||q.plannerArgument===-1)throw Error('Resolved shot requires an exact target coordinate.');
 return originalAssessedLaunch({...q,...originalTargetGeometry(q)},cache,map);
}
