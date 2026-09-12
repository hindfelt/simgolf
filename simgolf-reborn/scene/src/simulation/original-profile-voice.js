// Complete 0x46c140: tests bit7 of byte0x21 in the actor's original profile.
export function originalProfileVoice(q){
 const a=q.state.actors?.[q.actorId];
 if(!(a instanceof Uint8Array)||a.length!==256)throw Error('Original voice actor is unavailable.');
 const id=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xb6,true),profile=q.profileRecords?.[id];
 if(!(profile instanceof Uint8Array)||profile.length!==560)throw Error('Original voice profile is unavailable.');
 return (profile[0x21]&0x80)?0:1;
}
