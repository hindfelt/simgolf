import {originalProfileVoice} from './original-profile-voice.js';
// Original0x46806a–0x468148: select pronoun and gate an explanatory message.
// The two masks use x86's modulo32 shift, including kinds64/65.
export function originalRemarkExplanationGate(q){
 const events=[];if((q.kind|0)===50)return {next:'return',pronoun:null,events};
 events.push({address:0x46c140,args:[q.actorId]});const pronoun=originalProfileVoice(q)?'he':'she';
 const s=q.state;for(const key of ['originalClock','lastExplanationClock','explanationMaskLow','explanationMaskHigh'])if(!Number.isInteger(s[key]))throw Error('Original explanation globals are unavailable.');
 const kind=q.kind|0,bit=1<<(kind&31),mask=kind<32?s.explanationMaskLow:s.explanationMaskHigh;
 if(((s.originalClock-s.lastExplanationClock)|0)<=500)return {next:'return',pronoun,events};
 const actor=s.actors[q.actorId],a=new DataView(actor.buffer,actor.byteOffset,actor.byteLength);
 if(a.getInt16(0xae,true)!==0||(mask&bit)||a.getInt32(8,true)<=100||a.getInt32(8,true)>=700||a.getInt32(12,true)<=100||a.getInt32(12,true)>=400)return {next:'return',pronoun,events};
 return {next:'explanation',pronoun,events};
}

// Original0x468feb–0x469075: popup style and successful-display bookkeeping.
// The delta here is the selected delta (stack0x18), before difficulty reduction.
export function originalRemarkExplanationDisplay(q,showPopup){
 let state=structuredClone(q.state);const events=[],delta=q.selectedDelta|0;
 let style=delta>0?0x80000288:delta<0?0x80005084:0x80000210;
 if((q.difficulty|0)!==0&&delta< -1)style=0x80007084;
 if(!(state.interfaceFlags&4))return {state,events};
 if(typeof state.sourceText!=='string')throw Error('Original explanation text is unavailable.');
 if(state.sourceText.split('\0',1)[0]==='')return {state,events};
 const event={address:0x40c7f0,args:[style,-8,q.actorId|0]};events.push(event);
 if(typeof showPopup!=='function')throw Error('Original explanation popup requires a resolver.');
 const reply=showPopup(structuredClone(event),structuredClone(state));
 if(!reply?.state||!Number.isInteger(reply.result)||typeof reply.then==='function')throw Error('Expected synchronous original popup state and result.');
 state=structuredClone(reply.state);
 if((reply.result|0)!==0){
  const key=(q.kind|0)<32?'explanationMaskLow':'explanationMaskHigh';
  if(!Number.isInteger(state[key])||!Number.isInteger(state.originalClock))throw Error('Original explanation completion globals are unavailable.');
  state[key]=(state[key]|(1<<(q.kind&31)))>>>0;state.lastExplanationClock=state.originalClock;
 }
 return {state,events};
}
