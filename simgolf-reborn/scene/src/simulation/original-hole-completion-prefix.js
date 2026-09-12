import {originalRecordedHoleFee} from './original-recorded-hole-fee.js';
import {originalAfterFeeCompletion} from './original-after-fee-completion.js';
// 0x426b10–0x426f30. Caller eligibility and subsequent round progression
// remain separate. resolveRemark must run the complete original remark.
export function originalHoleCompletionPrefix(q,{playSpeech,readSettlement,resolveRemark,readClock}={}){
 const fee=originalRecordedHoleFee(q,playSpeech,readSettlement);
 const completion=originalAfterFeeCompletion({...q,state:fee.state},resolveRemark,readClock);
 return {...fee,state:completion.state,events:[...fee.events,...completion.events]};
}
