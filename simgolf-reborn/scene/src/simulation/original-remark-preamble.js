const signedByte=value=>(value<<24)>>24;
// golf.exe 0x467d72–0x467e4f. The optional event is an unresolved external
// effect at 0x447a30, not a completed UI-only notification.
export function originalRemarkPreamble(q){
 const source=q.kind===40?q.before:q.actor;
 if(!(source instanceof Uint8Array)||source.length!==256)throw Error('Expected complete original actor snapshot.');
 const actor=source.slice(),delta=q.delta|0;
 if(delta===0&&(q.kind|0)>=48)return {actor,next:'return',event:null};
 if(actor[0x18]!==0){
  const prior=signedByte(actor[0x36]);
  actor[0x36]=-Math.sign(prior)===Math.sign(delta)?0:prior+delta;
  const current=signedByte(actor[0x36]);
  if([2,3,12,13].includes(q.kind)&&current<0&&delta<0&&current<delta)actor[0x36]=1;
  const flags=new DataView(actor.buffer).getUint32(0x10,true);
  if(q.actorId===q.selectedActorId&&delta<0&&(flags&0x40000))
   return {actor,next:'effect',event:{address:0x447a30,args:[48,100,0,0,0]}};
 }
 return {actor,next:'outcome',event:null};
}
