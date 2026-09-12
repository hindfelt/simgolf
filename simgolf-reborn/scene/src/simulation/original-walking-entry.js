// 0x428ad1–0x428b38: initialise walking locals and gate a new angry complaint.
export function originalWalkingEntry(snapshot){
 const state=structuredClone(snapshot),b=state.actors?.[state.actorId],value=state.entryValue;
 if(!(b instanceof Uint8Array)||b.length!==256||!Number.isInteger(value)||value< -2147483648||value>2147483647)throw Error('Original walking entry unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),threshold=(value<<16)>>16;
 state.waitingGroups=value;state.serviceIndex=-1;state.followPartner=value;
 if(((state.worldFlags&0x200000)||(a.getUint8(0x20)&224)===32)&&a.getInt16(0xac,true)<threshold)a.setInt16(0xac,threshold,true);
 const complaint=a.getUint8(0x8c)===0&&!(a.getUint32(0x18,true)&0x20000000)&&a.getInt16(0xac,true)<threshold;
 return {state,next:complaint?'0x428b38':'0x428f64'};
}
