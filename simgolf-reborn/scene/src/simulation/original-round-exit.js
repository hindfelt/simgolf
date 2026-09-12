// Entry 0x425b50: three special visitor branches precede common cleanup.
// Their rewards/dialogue are explicit exits; ordinary actors reach 0x426aa8.
export function originalRoundExit(snapshot){
 const state=structuredClone(snapshot),id=state.actorId,b=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original round-exit actor unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),type=a.getUint8(0x20)&0xe0;
 const special={96:'0x425b74',64:'0x425e30',128:'0x426137'}[type];
 if(special)return {state,next:special};
 // Native masks to 0xe0 then compares against 0x100 at 0x42686e.
 // That fourth reward branch is unreachable; do not invent a new class.
 a.setInt32(0xdc,0,true);a.setUint8(0x29,19);
 if(a.getUint32(0x18,true)&0x200)state.selectionState=-1; // global 0x5a4440
 return {state,next:'return'};
}
