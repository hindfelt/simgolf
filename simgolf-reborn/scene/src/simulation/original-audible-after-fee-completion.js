import {originalAfterFeeCompletion} from './original-after-fee-completion.js';
import {originalAudibleRemarkWorld} from './original-audible-remark-world.js';
// Actual remark engine and packed-world write-back before completion reset.
export function originalAudibleAfterFeeCompletion(q,options={},readClock){
 const remarks=[];
 const completion=originalAfterFeeCompletion(q,(event,state)=>{
  const [actorId,kind,value]=event.args;
  const remark=originalAudibleRemarkWorld({...q,actorId,kind,value,state,holeRecords:state.holeRecords},options);
  remarks.push(remark);return {state:remark.state};
 },readClock);
 return {...completion,remarks};
}
