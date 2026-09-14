import {originalCompleteRemark} from './original-complete-remark.js';
import {originalPositionalSoundAt} from './original-positional-sound.js';

const audioState=s=>Object.fromEntries(['seed','queued','sequenceIndex'].filter(k=>Object.hasOwn(s,k)).map(k=>[k,s[k]]));
// Camera/terrain must come from the authoritative simulation snapshot. Playback
// is synchronous speculative state; a browser can render the returned events.
export function originalAudibleCompleteRemark(q,{audioContext,playback,reactionContext,...options}={}){
 let audioRandomDraws=0;const soundEvents=[];
 const play=(event,state)=>{
  if(typeof playback!=='function')throw Error('Original playback requires an explicit resolver.');
  soundEvents.push(structuredClone(event));
  const reply=playback(structuredClone(event),structuredClone(state));
  if(!reply||typeof reply.then==='function')throw Error('Expected synchronous original playback state.');
  return reply;
 };
 const sound=(event,state)=>{
  if(event.address===0x447a30)return play(event,state);
  if(event.address===0x4a0000)return state; // Original activation helper is RET.
  if(event.address!==0x40c1f0)throw Error('Unexpected original audio effect.');
  if(typeof audioContext!=='function')throw Error('Original audio world snapshot is unavailable.');
  const context=audioContext(structuredClone(state));
  if(!context||typeof context.then==='function')throw Error('Expected synchronous original audio snapshot.');
  const [soundId,x,z,duration]=event.args;
  const result=originalPositionalSoundAt({...context,soundId,x,z,duration,state},context.map,play);
  audioRandomDraws+=result.randomDraws;return result.state;
 };
 const result=originalCompleteRemark(q,{
  ...options,playSpeech:sound,resolveEffect:(event,state)=>({state:sound(event,state),result:0}),
  reactionContext:(state,kind)=>{
   if(typeof reactionContext!=='function')throw Error('Original reaction world snapshot is unavailable.');
   const fresh=reactionContext(state,kind);
   if(!fresh?.state||typeof fresh.then==='function')throw Error('Expected synchronous original reaction snapshot.');
   return {...fresh,state:{...fresh.state,...audioState(state)}};
  }
 });
 // Reaction audio fields live in its scalar snapshot. Keep the final popup seed
 // already returned by the complete routine, including on early returns.
 if(result.reaction){const {seed,...queue}=audioState(result.reaction.state);Object.assign(result.state,queue);}
 return {...result,audioRandomDraws,soundEvents};
}
