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
