import {originalPaidHoleCompletion} from './original-paid-hole-completion.js';
import {originalMatchCompletionEntry} from './original-match-completion-entry.js';
import {originalRoundFinish} from './original-round-finish.js';
import {originalResolvedNextHole} from './original-resolved-next-hole.js';

// Compose ordinary completion; match-result and special-visitor branches
// remain explicit, rather than being treated as ordinary rounds.
export function originalHoleComplete(snapshot,resolve,resolveSpecial){
 const paid=originalPaidHoleCompletion(snapshot,resolve);
 let next;
 if(paid.next==='0x427e25')next=originalResolvedNextHole(paid.state,resolveSpecial);
 else{
  const match=originalMatchCompletionEntry(paid.state);
  if(match.next!=='0x427a53')return {...match,calls:paid.calls};
  next=originalRoundFinish(match.state,resolve,resolveSpecial);
 }
 return {...next,calls:[...paid.calls,...(next.calls||[])]};
}
