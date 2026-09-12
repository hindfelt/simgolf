import {originalGolferLoop,resumeOriginalGolferLoop} from './original-golfer-loop.js';
import {originalGolferEffects} from './original-golfer-effects.js';
export function originalGolferTerrainLoop(snapshot,resolve,resolveSpecial,plannerFor){
 const dispatch=originalGolferEffects(resolve,plannerFor);
 const result=originalGolferLoop(snapshot,dispatch,resolveSpecial);
 return {...result,soundEvents:dispatch.drainSoundEvents()};
}

// Keep the speculative presentation batch until the entire resumed pass is
// accepted. Callers must not play sounds from an incomplete result.
export function resumeOriginalGolferTerrainLoop(suspended,resumeTurn,resolve,resolveSpecial,plannerFor){
 if(!Array.isArray(suspended?.soundEvents))throw Error('Original suspended sounds unavailable.');
 const dispatch=originalGolferEffects(resolve,plannerFor);
 const result=resumeOriginalGolferLoop(suspended,turn=>resumeTurn(turn,dispatch),dispatch,resolveSpecial);
 return {...result,soundEvents:[...structuredClone(suspended.soundEvents),...dispatch.drainSoundEvents()]};
}
