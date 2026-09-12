import {originalGolferLoop} from './original-golfer-loop.js';
import {originalGolferEffects} from './original-golfer-effects.js';
export function originalGolferTerrainLoop(snapshot,resolve,resolveSpecial,plannerFor){
 const dispatch=originalGolferEffects(resolve,plannerFor);
 const result=originalGolferLoop(snapshot,dispatch,resolveSpecial);
 return {...result,soundEvents:dispatch.drainSoundEvents()};
}
