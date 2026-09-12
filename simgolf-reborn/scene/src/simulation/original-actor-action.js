import {originalSwingClearance} from './original-swing-clearance.js';
import {originalSwingProgress} from './original-swing-progress.js';
import {originalActorDecision} from './original-actor-decision.js';
import {originalShotPreparation} from './original-shot-preparation.js';

// Normal actor prefix through shot preparation. Returned walking, motion and
// tutorial continuations still require their original bodies from the caller.
export function originalActorAction(snapshot,resolve){
 const decision=originalActorDecision(snapshot,resolve);
 if(decision.next==='0x42b825'){
  const clearance=originalSwingClearance({...decision.state,ballTerrain:decision.ballTerrain});
  const swing=clearance.next==='progress'?originalSwingProgress(clearance.state,resolve):clearance;
  return {...decision,...swing,calls:[...decision.calls,...(swing.calls||[])],randomDraws:decision.randomDraws+clearance.randomDraws};
 }
 if(decision.next!=='0x42b55c')return decision;
 const prepared=originalShotPreparation({...decision.state,ballTerrain:decision.ballTerrain,ballTile:decision.ballTile},resolve);
 return {...decision,...prepared,calls:[...decision.calls,...prepared.calls]};
}
