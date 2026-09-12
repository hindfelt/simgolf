import {originalRecordedHoleFee} from './original-recorded-hole-fee.js';
import {originalAudibleAfterFeeCompletion} from './original-audible-after-fee-completion.js';
// Original completion 0x426b10–0x426f30 with actual audible remarks.
// Caller eligibility and later round progression remain outside this prefix.
export function originalAudibleHoleCompletionPrefix(q,{playSpeech,readSettlement,readClock,...remarkOptions}={}){
 const fee=originalRecordedHoleFee(q,playSpeech,readSettlement);
 const completion=originalAudibleAfterFeeCompletion({...q,state:fee.state},remarkOptions,readClock);
 return {...fee,state:completion.state,events:[...fee.events,...completion.events],remarks:completion.remarks};
}
