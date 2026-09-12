import {originalProfileVoice} from './original-profile-voice.js';
import {originalRemarkHistory} from './original-remark-history.js';
// 0x467408–0x467502 (including the branch at0x467566): speech, repeat
// suppression, history snapshot and profile voice offset before delta selection.
export function originalRemarkPreparation(q,playSound){
 let state=structuredClone(q.state);const events=[];
 const record=()=>{const a=state.actors?.[q.actorId];if(!(a instanceof Uint8Array)||a.length!==256)throw Error('Original remark preparation actor is unavailable.');return a;};
 const voice=()=>{events.push({address:0x46c140,args:[q.actorId]});return originalProfileVoice({...q,state});};
 if((q.kind|0)===35){
  const a=record(),v=new DataView(a.buffer,a.byteOffset,a.byteLength),x=v.getInt32(0,true),z=v.getInt32(4,true);
  const event={address:0x40c1f0,args:[70+voice(),x,z,0]};events.push(event);
  if(typeof playSound!=='function')throw Error('Original remark speech requires a resolver.');
  const reply=playSound(structuredClone(event),structuredClone(state));if(!reply||typeof reply.then==='function')throw Error('Expected synchronous original speech state.');state=structuredClone(reply);
  if(record()[0x70]===35)return {state,events,next:'return',before:null,voiceOffset:null};
 }else if((q.kind|0)===19)return {state,events,next:'return',before:null,voiceOffset:null};
 const history=originalRemarkHistory(record(),q.kind,q.value);state.actors[q.actorId]=history.actor;
 const a=record(),profile=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xb6,true),data=q.profileRecords?.[profile];
 if(!(data instanceof Uint8Array)||data.length!==560)throw Error('Original remark profile is unavailable.');
 const offset=(data[0x23]>>>4)+(voice()===0?5:0);
 return {state,events,next:'adjustment',before:history.before,voiceOffset:offset};
}
