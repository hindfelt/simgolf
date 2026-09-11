import {originalRemarkPreamble} from './original-remark-preamble.js';
import {originalRemarkOutcome} from './original-remark-outcome.js';
// Contiguous common reaction stages, 0x467d72–0x46806a. The audio boundary
// remains explicit; caller resolves its effect against speculative state.
export function originalRemarkResponse(q,resolveEffect){
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
 return {next:'continue',...originalRemarkOutcome({...q,state}),events};
}
