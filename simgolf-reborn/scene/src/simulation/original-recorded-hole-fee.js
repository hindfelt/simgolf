import {originalHoleCompletionStats} from './original-hole-completion-stats.js';
import {originalCompleteFee} from './original-complete-fee.js';
// Completion prefix through fee posting, 0x426b10–0x426e6b. Remaining
// completion progression and the caller's eligibility check are separate.
export function originalRecordedHoleFee(q,playSpeech,readSettlement){
 const recorded=originalHoleCompletionStats(q);
 const fee=originalCompleteFee({...q,state:recorded.state,holeRecords:recorded.state.holeRecords},playSpeech,readSettlement);
 return {...fee,events:[...recorded.events,...fee.events]};
}
