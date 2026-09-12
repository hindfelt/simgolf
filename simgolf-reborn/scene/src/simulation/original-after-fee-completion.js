import {originalHoleCompletionReset} from './original-hole-completion-reset.js';
// Original 0x426e6b–0x426f30. The remark resolver must apply the complete
// kind-19 remark to the authoritative packed world before returning it.
export function originalAfterFeeCompletion(q,resolveRemark,readClock){
 let state=structuredClone(q.state);const events=[];
 const actor=state.actors?.[q.actorId];
 if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original completion actor is unavailable.');
 if(actor[0x84]===0){
  const event={address:0x4672d0,args:[q.actorId,19,new DataView(actor.buffer,actor.byteOffset,actor.byteLength).getInt16(0xa4,true)]};events.push(event);
  if(typeof resolveRemark!=='function')throw Error('Original completion remark resolver is unavailable.');
  const result=resolveRemark(structuredClone(event),structuredClone(state));
  if(!result?.state||typeof result.then==='function')throw Error('Expected synchronous original completion remark state.');
  state=structuredClone(result.state);
 }
 let clock=q.clock;
 if(readClock!==undefined){
  if(typeof readClock!=='function')throw Error('Original completion clock reader is invalid.');
  clock=readClock(structuredClone(state));
 }
 return {...originalHoleCompletionReset({...q,state,clock}),events};
}
