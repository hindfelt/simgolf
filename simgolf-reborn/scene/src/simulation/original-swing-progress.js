// Native 0x42bb3b–0x42bdb5: swing frames, impact effects, and golfer stance.
// This stage starts after the phase-1 partner/course-clearance gate.
export function originalSwingProgress(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId,terrain=state.ballTerrain;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original swing actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original swing effect requires an explicit resolver.');const event={address,args};calls.push(event);const reply=resolve(structuredClone(event),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original swing state.');state=structuredClone(reply.state);}
 let a=actor();if(!Number.isInteger(terrain)||a.getUint8(0x28)<2)throw Error('Original swing phase is unavailable.');
 if(a.getUint8(0x28)===2){
  if(a.getUint8(0x24)!==13)a.setUint8(0x22,(a.getUint8(0x22)+2)&7);
  a.setUint32(0x18,a.getUint32(0x18,true)|0x800,true);a.setUint8(0x26,0);
 }
 a.setUint8(0x28,a.getUint8(0x28)+1);
 a.setUint8(0x25,Math.max(0,Math.min(6,a.getInt8(0x28)-3)));
 if(a.getInt8(0x28)>120)a.setUint8(0x28,120);
 if(a.getUint8(0x25)===5){
  const style=a.getUint8(0x21);let sound=190;if(!(style&1))sound=193;if(!(style&2))sound=191;if(!(style&4))sound=192;
  if(a.getUint32(0x18,true)&0x400000){sound=189;call(0x4672d0,[id,40,0]);a=actor();a.setUint8(0x8c,3);}
  if(a.getInt8(0x24)>=10)sound=2;if(terrain===1)sound=3;
  if(!(a.getUint32(0x18,true)&0x40000)){
   call(0x40c1f0,[sound,a.getInt32(8,true),a.getInt32(12,true),0]);
   if(terrain===2)call(0x409820,[id]);
  }
  a=actor();a.setUint32(0x18,a.getUint32(0x18,true)|0x40000,true);
  if(a.getInt32(0x10,true)!==-1)call(0x409780,[id]);
  a=actor();
  if((a.getUint8(0x21)&0xf0)&&terrain!==1){
   if(!Number.isInteger(state.selectedActor))throw Error('Original selected actor is unavailable.');
   if(id===state.selectedActor)call(0x40c1f0,[46,a.getInt32(8,true),a.getInt32(12,true),1000]);
  }
 }
 a=actor();
 if(a.getInt8(0x25)<=4&&!(a.getUint32(0x18,true)&0x40000))return {state,calls,next:'skip'};
 if(a.getUint8(0x28)===32&&(a.getUint32(0x18,true)&0x4000)){a.setUint32(0x18,a.getUint32(0x18,true)|0x400,true);a.setUint8(0x28,0);}
 if(a.getUint8(0x28)===0){
  const facing=a.getUint8(0x22),direction=(facing+2)&7,scale=(((~facing)&1)|2)<<(terrain===1?6:7);
  a.setInt32(8,(a.getInt32(0xcc,true)-Math.imul([0,1,1,1,0,-1,-1,-1][direction],scale))|0,true);
  a.setInt32(12,(a.getInt32(0xd0,true)-Math.imul([-1,-1,0,1,1,1,0,-1][direction],scale))|0,true);
 }
 return {state,calls,next:'motion'};
}
