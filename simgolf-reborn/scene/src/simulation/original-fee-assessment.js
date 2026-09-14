// Original 0x426be5–0x426c92. Units are displayed as dollars *100 later;
// payment booking and suppression are separate stages. No inferred bonus names.
export function originalFeeAssessment(q,playSpeech){
 let state=structuredClone(q.state);const actor=state.actors?.[q.actorId];
 if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original fee actor is unavailable.');
 const a=new DataView(actor.buffer,actor.byteOffset,actor.byteLength),holeIndex=(actor[0x21]<<24)>>24,profile=a.getInt16(0xb6,true);
 const hole=q.holeRecords?.[holeIndex+1],tier=q.profileTiers?.[profile];
 if(!(hole instanceof Uint8Array)||hole.length!==520||!Number.isInteger(tier)||!Number.isInteger(q.reactionMode)||!Number.isInteger(q.feeBonus))throw Error('Original fee inputs are unavailable.');
 let units=a.getInt16(0xa4,true);if(q.reactionMode===2)units=(units*2)|0;
 const flags=new DataView(hole.buffer,hole.byteOffset,hole.byteLength).getUint32(0,true);
 if(flags&1)units=(units+2)|0;if(flags&2)units=(units+2)|0;units=(units+q.feeBonus)|0;
 const level=tier&7,events=[];
 if(level>3)units=(units+(level===4?2:5))|0;
 state.feeUnits=units;
 if(level>3){
  const event={address:0x40c1f0,args:[25,a.getInt32(0,true),a.getInt32(4,true),0]};events.push(event);
  if(typeof playSpeech!=='function')throw Error('Original fee speech requires a resolver.');
  const reply=playSpeech(structuredClone(event),structuredClone(state));
  if(!reply||typeof reply.then==='function'||!Number.isInteger(reply.feeUnits))throw Error('Expected synchronous original fee speech state.');
  state=structuredClone(reply);
 }
 return {state,events};
}
