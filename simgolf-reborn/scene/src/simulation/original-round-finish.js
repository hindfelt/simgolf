import {originalRoundResults} from './original-round-results.js';
import {originalResolvedNextHole} from './original-resolved-next-hole.js';

// Continuous recovered path from 0x427a53 through ordinary next-hole return.
// Earlier settlement and special visitor dialogue remain explicit boundaries.
export function originalRoundFinish(snapshot,resolvePresentation,resolveSpecial){
 const results=originalRoundResults(snapshot,resolvePresentation);
 const transition=originalResolvedNextHole(results.state,resolveSpecial);
 return {...results,...transition,calls:[...(results.calls||[]),...(transition.calls||[])]};
}
