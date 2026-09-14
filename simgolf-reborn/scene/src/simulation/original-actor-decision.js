import {originalActorDispatch} from './original-actor-dispatch.js';
import {originalShotLine} from './original-shot-line.js';
import {originalShotEntry} from './original-shot-entry.js';
import {originalTurnOrder} from './original-turn-order.js';

// Continuous 0x42819c through turn selection and shot entry, including early motion/skip
// exits. The returned continuation is an address, not an invented shot action.
export function originalActorDecision(snapshot, resolve) {
 const prefix=originalActorDispatch(snapshot,resolve);
 if(prefix.next!=='continue')return prefix;
 const line=originalShotLine({...prefix.state,ballTerrain:prefix.ballTerrain},resolve);
 const turn=originalTurnOrder(line.state,resolve);
 const calls=[...prefix.calls,...line.calls,...turn.calls];
 if(turn.next!=='0x42b3f2')return {...prefix,...turn,calls};
 const entry=originalShotEntry({...turn.state,closerToCup:turn.closerToCup},resolve);
 return {...prefix,...turn,...entry,calls:[...calls,...entry.calls]};
}
