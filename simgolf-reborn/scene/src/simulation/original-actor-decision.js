import {originalActorDispatch} from './original-actor-dispatch.js';
import {originalShotLine} from './original-shot-line.js';
import {originalTurnOrder} from './original-turn-order.js';

// Continuous 0x42819c–0x428ad1 / 0x42b3f2, including early motion/skip
// exits. The returned continuation is an address, not an invented shot action.
export function originalActorDecision(snapshot, resolve) {
 const prefix=originalActorDispatch(snapshot,resolve);
 if(prefix.next!=='continue')return prefix;
 const line=originalShotLine({...prefix.state,ballTerrain:prefix.ballTerrain},resolve);
 const turn=originalTurnOrder(line.state,resolve);
 return {...prefix,...turn,calls:[...prefix.calls,...line.calls,...turn.calls]};
}
