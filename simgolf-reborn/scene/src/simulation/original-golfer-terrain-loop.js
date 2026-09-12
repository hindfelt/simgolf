import {originalGolferLoop} from './original-golfer-loop.js';
import {originalGolferEffects} from './original-golfer-effects.js';
export function originalGolferTerrainLoop(snapshot,resolve,resolveSpecial,plannerFor){
 return originalGolferLoop(snapshot,originalGolferEffects(resolve,plannerFor),resolveSpecial);
}
