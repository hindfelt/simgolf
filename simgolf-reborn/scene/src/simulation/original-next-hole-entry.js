// Native 0x427e25–0x427ec4: advance/wrap, event-clock adjustment and
// partner/end-of-course gate. Later dialogue and destination setup remain separate.
export function originalNextHoleEntry(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function actor(index=id){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original next-hole actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function par(hole){const b=state.holeRecords?.[hole];if(!(b instanceof Uint8Array)||b.length!==520)throw Error('Original next-hole record unavailable.');return b[0];}
 if(!Number.isInteger(state.globalFlags)||state.globalFlags<0||state.globalFlags>0xffffffff)throw Error('Original next-hole flags unavailable.');
 let a=actor();a.setUint8(0x29,a.getUint8(0x29)+1);
 if(state.globalFlags&0x4200000){
  if(!par(a.getInt8(0x29)))a.setUint8(0x29,1);
  if(!Number.isInteger(state.courseHoleCount)||state.courseHoleCount< -2147483648||state.courseHoleCount>2147483647)throw Error('Original course hole count unavailable.');
  a.setUint16(0xc6,a.getUint16(0xc6,true)+Math.imul(state.courseHoleCount,2),true);
  const scoreOffset=0x2b+a.getInt8(0x29);
  if(scoreOffset<0||scoreOffset>=256)throw Error('Original next-hole score unavailable.');
  if(a.getUint8(scoreOffset)!==0){
   if(typeof resolve!=='function')throw Error('Original next-hole reset requires a resolver.');
   const e={address:0x425b50,args:[id]};calls.push(e);
   const reply=resolve(structuredClone(e),structuredClone(state));
   if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original next-hole state.');
   state=structuredClone(reply.state);
  }
 }else{
  if(!par(a.getInt8(0x29)))return {state,calls,next:'0x4280e4'};
  const partnerHole=actor(a.getInt16(0xaa,true)).getUint8(0x29);
  if(partnerHole===0||partnerHole===19)return {state,calls,next:'0x4280e4'};
 }
 return {state,calls,next:'0x427ec4'};
}
