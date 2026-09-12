const signedByte = value => (value << 24) >> 24;
// golf.exe 0x4672da–0x46737d: remark eligibility and type remapping.
// This is the entry stage only; no display, happiness or social effects occur here.
export function originalRemarkEntry(q) {
 const shot=signedByte(q.shotCounter);
 if(shot>9 || (q.actorId|0)>=152 || (q.globalFlags&0x02000000))
  return {allowed:false,kind:q.kind|0};
 let kind=q.kind|0;
 if(kind===0x13 && (q.actorStatus&0xe0)!==0x20 && (q.holeCompletions|0)>=10){
  const relative=signedByte(q.holeStrokes)-signedByte(q.par);
  if(((q.holeFlags&4)&&relative>1)||((q.holeFlags&8)&&relative<0))kind=0x17;
 }
 return {allowed:true,kind};
}

// Read eligibility from the same packed records consumed by dispatch.
export function originalRecordRemarkEntry(q){
 const actor=q.state.actors?.[q.actorId];if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original remark actor is unavailable.');
 if(!Number.isInteger(q.globalFlags))throw Error('Original remark global flags are unavailable.');
 const input={actorId:q.actorId,kind:q.kind,shotCounter:actor[0x22],actorStatus:actor[0x18],globalFlags:q.globalFlags};
 const preliminary=originalRemarkEntry(input);
 if(!preliminary.allowed||preliminary.kind!==19||(actor[0x18]&0xe0)===0x20)return preliminary;
 const h=signedByte(actor[0x21]),current=q.holeRecords?.[h];
 if(!(current instanceof Uint8Array)||current.length!==520)throw Error('Original remark hole record is unavailable.');
 const holeCompletions=new DataView(current.buffer,current.byteOffset,current.byteLength).getInt32(0x28,true);
 if(holeCompletions<10)return preliminary;
 const next=q.holeRecords?.[h+1];if(!(next instanceof Uint8Array)||next.length!==520||h+0x23<0||h+0x23>=256)throw Error('Original remark score record is unavailable.');
 return originalRemarkEntry({...input,holeCompletions,holeStrokes:actor[0x23+h],par:current[8],holeFlags:new DataView(next.buffer,next.byteOffset,next.byteLength).getUint32(0,true)});
}
