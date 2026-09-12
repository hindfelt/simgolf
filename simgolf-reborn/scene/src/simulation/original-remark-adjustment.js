import {originalRemarkSelection} from './original-remark-selection.js';
import {originalRemarkResponse} from './original-remark-response.js';
import {originalPositionalSoundAt} from './original-positional-sound.js';

// Resolve positional speech inside the reaction, so its RNG/queue writes
// reach the following outcome stage. Only actual playback remains external.
// context(state) supplies original camera, zoom and terrain reads belonging
// to this speculative state; it must not read a spectator's current camera.
export function originalAudibleRemarkAdjustment(q,context,playback,readOutcome){
 let soundDraws=0;
 const soundEvents=[];
 const play=(event,state)=>{
  if(typeof playback!=='function')throw Error('Original reaction playback requires an explicit resolver.');
  soundEvents.push(structuredClone(event));
  const reply=playback(structuredClone(event),structuredClone(state));
  if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative playback state.');
  return reply;
 };
 const result=originalRemarkAdjustment(q,(event,state)=>{
  if(event.address===0x447a30)return {state:play(event,state),result:0};
  if(event.address!==0x40c1f0)throw Error('Unexpected original reaction effect.');
  const {camera,zoom,map}=context(structuredClone(state));
  const [soundId,x,z,duration]=event.args;
  const sound=originalPositionalSoundAt({camera,zoom,soundId,x,z,duration,state},map,play);
  soundDraws+=sound.randomDraws;
  return {state:sound.state,result:0};
 },readOutcome);
 return {...result,randomDraws:result.randomDraws+soundDraws,soundEvents};
}
// Common remark dispatch through reaction counters (0x467502–0x46806a).
// Entry/history and later explanatory display remain outside this stage.
export function originalRemarkAdjustment(q,resolve,readOutcome){
 const selection=originalRemarkSelection(q,resolve);
 const response=originalRemarkResponse({...q,state:selection.state,delta:selection.delta},
  typeof resolve==='function'?(event,state)=>{
   const reply=resolve(event,state);
   if(!reply?.state||!Number.isInteger(reply.result))throw Error('Expected speculative state and integer call result.');
   return reply.state;
  }:undefined,readOutcome);
 return {...response,selectedDelta:selection.delta,events:[...selection.events,...response.events]};
}
