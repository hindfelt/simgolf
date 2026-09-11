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
