import {originalVoiceVariant} from './original-voice-variant.js';
// Original per-request dispatch at 0x467502–0x467d72. Calls remain explicit
// speculative-state boundaries; no guessed presentation-only implementations.
export function originalRemarkSelection(q,resolve){
 let state=structuredClone(q.state),delta=0;
 const events=[];
 const view=()=>new DataView(state.actor.buffer,state.actor.byteOffset,state.actor.byteLength);
 const call=(address,args)=>{
  const event={address,args};events.push(structuredClone(event));
  if(typeof resolve!=='function')throw Error('Original remark selection requires an effect resolver.');
  const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply?.state||!Number.isInteger(reply.result))throw Error('Expected speculative state and integer call result.');
  state=structuredClone(reply.state);return reply.result|0;
 };
 const flag=mask=>!!(view().getUint32(0x10,true)&mask);
 const speak=(base,range=0,transform)=>{
  const x=view().getInt32(0,true),z=view().getInt32(4,true);
  events.push({address:0x46c140,args:[q.actorId]});
  const voice=originalVoiceVariant(state.actor,state.profileVoiceBytes);
  call(0x40c1f0,[transform?transform(voice):(voice+base)|0,x,z,range]);
 };
 const fixedSpeak=(id,range=0)=>call(0x40c1f0,[id|0,view().getInt32(0,true),view().getInt32(4,true),range]);
 const profile=()=>{
  const id=view().getInt16(0xb6,true),result=state.profiles[id];
  if(!Number.isInteger(result))throw Error(`Missing original profile ${id}.`);
  return result;
 };
 // The supplied executable's 0x4a0000 consists of RET; preserve the call
 // trace without allowing an external resolver to invent a state change.
 const activate=mask=>{if(profile()&mask)events.push({address:0x4a0000,args:[q.actorId]});};
 const tired=()=>{state.actor[0x1d]=14;view().setInt16(0x9e,-24,true);};
 const negative={4:[-2,18],9:[-3,70],10:[-2,80],14:[-1,158],15:[-1,156],21:[-2,68],24:[-2,66],26:[-1,160],30:[-2,152],35:[-2,70],36:[-3,62],43:[-2,80]};
 const positive={6:20,11:74,29:150,32:162,33:162,47:72};
 const k=q.kind|0;
 if(negative[k]){[delta]=negative[k];speak(negative[k][1]);}
 else if(positive[k]!==undefined){delta=1;speak(positive[k]);}
 else switch(k){
  case 1:delta=1;fixedSpeak(q.voiceBase+210+(flag(0x20000)?20:0));break;
  case 2:case 3:case 8:
   delta=k===2?-1:-2;fixedSpeak(q.voiceBase+(flag(0x20000)?16:220),k!==8&&q.terrainCode===17?1000:0);break;
  case 5:case 31:speak(16);break;
  case 7:if((q.value|0)===0){delta=1;speak(76);}break;
  case 12:case 13:delta=-1;speak(8,500);break;
  case 18:delta=+(view().getInt16(0xa6,true)>=8);if(delta)activate(1);break;
  case 20:delta=-2;speak(86);tired();break;
  case 22:delta=1;speak(78);tired();break;
  case 23:delta=q.difficulty===0?-1:-2;speak(154);break;
  case 25:case 27:
   delta=+(view().getInt16(k===25?0xa8:0xaa,true)>=(k===25?8:60));
   speak(k===25?60:72);if(delta)activate(1);break;
  case 28:delta=1;speak(76);tired();break;
  case 34:delta=1;speak(0,0,v=>164+(v!==0?3:0));break;
  case 39:delta=+(q.difficulty<2);speak(20);break;
  case 44:case 46:delta=1;break;
  case 51:case 52:case 53:delta=+(q.difficulty===0);activate(4);break;
  case 54:delta=+(q.difficulty<=1);break;
  case 58:speak(0,0,v=>90+(v!==0?75:0));break;
  case 59:{
   const id=view().getInt16(0xb6,true),hole=(state.actor[0x21]<<24)>>24;
   const value=state.holeBytes[`${id}:${hole}`];
   if(!Number.isInteger(value))throw Error('Missing original per-profile hole byte.');
   delta=+((value&255)!==0);break;
  }
  case 65:delta=q.difficulty>1?-2:0;speak(22);break;
 }
 return {state,delta,events};
}
