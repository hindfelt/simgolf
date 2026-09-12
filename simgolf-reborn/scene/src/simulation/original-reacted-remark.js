import {originalPreparedRemarkDispatch} from './original-remark-dispatch.js';
import {originalRemarkAdjustment} from './original-remark-adjustment.js';
// World counters and tile state must be read after message/history processing.
// The returned reaction state contains their updated values for the world writer.
export function originalReactedRemark(q,resolvePhrase,readResource,playSpeech,reactionContext,resolveEffect){
 const prepared=originalPreparedRemarkDispatch(q,resolvePhrase,readResource,playSpeech);
 if(prepared.next==='return')return {...prepared,reaction:null};
 if(typeof reactionContext!=='function')throw Error('Original reaction world snapshot is unavailable.');
 const context=reactionContext(structuredClone(prepared.state),prepared.kind);
 if(!context?.state)throw Error('Original reaction world snapshot is unavailable.');
 const actors=prepared.state.actors,profileVoiceBytes={},profiles={},holeBytes={};
 for(const [id,r] of Object.entries(q.profileRecords||{})){
  if(!(r instanceof Uint8Array)||r.length!==560)throw Error('Original reaction profile record is unavailable.');
  profiles[id]=r[0x20];profileVoiceBytes[id]=r[0x21];
 }
 for(const [id,r] of Object.entries(q.profileHistory||{})){
  if(!(r instanceof Uint8Array)||r.length!==44)throw Error('Original reaction profile history is unavailable.');
  for(let hole=0;hole<r.length;hole++)holeBytes[`${id}:${hole}`]=r[hole];
 }
 const reaction=originalRemarkAdjustment({...context,actorId:q.actorId,kind:prepared.kind,value:q.value,globalFlags:q.globalFlags,before:prepared.before,voiceBase:prepared.voiceOffset,state:{...context.state,actor:actors[q.actorId],profiles,profileVoiceBytes,holeBytes}},resolveEffect);
 const state=structuredClone(prepared.state);state.actors[q.actorId]=reaction.state.actor;
 return {...prepared,state,next:reaction.next,reaction};
}
