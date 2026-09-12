import {originalFeeAssessment} from './original-fee-assessment.js';
import {originalFeeSettlement} from './original-fee-settlement.js';
// Full fee section, 0x426be5–0x426e6b. Caller owns hole-completion eligibility.
export function originalCompleteFee(q,playSpeech,readSettlement){
 const assessment=originalFeeAssessment(q,playSpeech);
 let current={...q,state:assessment.state};
 if(readSettlement!==undefined){
  if(typeof readSettlement!=='function')throw Error('Original settlement snapshot reader is invalid.');
  const fresh=readSettlement(structuredClone(assessment.state));
  if(!fresh?.state||typeof fresh.then==='function')throw Error('Expected synchronous original settlement snapshot.');
  current={...current,...fresh,actorId:q.actorId,state:structuredClone(fresh.state)};
 }
 const settlement=originalFeeSettlement(current);
 return {...settlement,events:[...assessment.events,...settlement.events]};
}
