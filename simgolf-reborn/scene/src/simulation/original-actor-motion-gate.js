// 0x42880a–0x42889c: motion flag, negative delay and actor cleanup gates.
// The host continues at the returned native branch; this does not replace the
// intervening terrain/comfort update or the walking/shot bodies.
export function originalActorMotionGate(snapshot,resolve) {
 let state=structuredClone(snapshot);const calls=[];let previousFlags=null;
 function actor(){const b=state.actors?.[state.actorId];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original motion gate actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 if(!Number.isInteger(state.actorId)||state.actorId<0||state.actorId>=152||!Number.isInteger(state.phaseCounter)||state.phaseCounter<0||state.phaseCounter>0xffffffff)throw Error('Invalid original motion gate snapshot.');
 const done=next=>({state,calls,previousFlags,next});
 function call(address){
  if(typeof resolve!=='function')throw Error('Original motion gate requires an explicit resolver.');
  const event={address,args:[state.actorId]};calls.push(event);
  const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original motion gate state.');
  state=structuredClone(reply.state);
 }
 let a=actor();
 if(a.getInt32(0xec,true)===0)a.setUint32(0x18,a.getUint32(0x18,true)&0xfffbffff,true);
 const delay=a.getInt16(0xa6,true);
 if(delay<0){
  if(state.phaseCounter&1)a.setInt16(0xa6,delay+1,true);
  return done(a.getUint32(0x18,true)&0x40000?'motion':'skip');
 }
 if(a.getUint32(0x18,true)&0x80000000)call(0x406450);
 a=actor();previousFlags=a.getUint32(0x18,true);a.setUint32(0x18,previousFlags&0xffff7fff,true);
 if(a.getInt8(0x2a)>=10){call(0x426b00);return done('skip');}
 return done('continue');
}
