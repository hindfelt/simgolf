import {originalRemarkSelection} from './original-remark-selection.js';
import {originalRemarkResponse} from './original-remark-response.js';
// Common remark dispatch through reaction counters (0x467502–0x46806a).
// Entry/history and later social/display logic remain outside this stage.
export function originalRemarkAdjustment(q,resolve){
 const selection=originalRemarkSelection(q,resolve);
 const response=originalRemarkResponse({...q,state:selection.state,delta:selection.delta},
  typeof resolve==='function'?(event,state)=>{
   const reply=resolve(event,state);
   if(!reply?.state||!Number.isInteger(reply.result))throw Error('Expected speculative state and integer call result.');
   return reply.state;
  }:undefined);
 return {...response,selectedDelta:selection.delta,events:[...selection.events,...response.events]};
}
