import {originalRemarkPreamble} from './original-remark-preamble.js';
import {originalRemarkOutcome} from './original-remark-outcome.js';
// Contiguous common reaction stages, 0x467d72–0x46806a. The audio boundary
// remains explicit; caller resolves its effect against speculative state.
export function originalRemarkResponse(q,resolveEffect,readOutcome){
 let state=structuredClone(q.state);
 const pre=originalRemarkPreamble({...q,actor:state.actor});
 state.actor=pre.actor;
 const events=[];
 if(pre.next==='return')return {next:'return',state,delta:q.delta|0,randomDraws:0,events};
 if(pre.event){
  if(typeof resolveEffect!=='function')throw Error('Original remark sound effect requires a resolver.');
  const event=structuredClone(pre.event);events.push(event);
  const reply=resolveEffect(structuredClone(event),structuredClone(state));
  if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative effect state.');
  state=structuredClone(reply);
 }
 let outcome={...q,state};
 if(readOutcome!==undefined){
  if(typeof readOutcome!=='function')throw Error('Original outcome snapshot reader is invalid.');
  const fresh=readOutcome(structuredClone(state));
  if(!fresh?.state||typeof fresh.then==='function')throw Error('Expected synchronous original outcome snapshot.');
  outcome={...q,...fresh,actorId:q.actorId,kind:q.kind,value:q.value,delta:q.delta,state:{...state,...structuredClone(fresh.state),actor:state.actor}};
 }
 return {next:'continue',...originalRemarkOutcome(outcome),events};
}
