// 0x42b2b2–0x42b408: scheduled fatigue, movement override and walk animation.
export function originalWalkingPostStep(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original post-step actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let a=actor();
 if(((state.phaseCounter+Math.imul(id,11))|0)%24===0&&a.getUint8(0x29)!==19){
  const prior=Math.trunc(a.getInt16(0xb2,true)/40),index=state.actorIndex;
  if(!(state.tileFlags instanceof Uint16Array)||!Number.isInteger(index)||index<0||index>=2500)throw Error('Original post-step flags unavailable.');
  let cost=1;if(!(state.tileFlags[index]&32)){const value=state.metadata?.[state.nextTerrain]?.walkingCost;if(!Number.isInteger(value))throw Error('Original walking cost unavailable.');cost=(value<<24)>>24;}
  a.setInt16(0xb2,a.getInt16(0xb2,true)+cost,true);a.setInt16(0xb2,a.getInt16(0xb2,true)+Math.trunc(a.getInt8(0x29)/6),true);
  const fatigue=a.getInt16(0xb2,true);
  if(fatigue>=160&&Math.trunc(fatigue/40)!==prior){
   if((a.getUint8(0x20)&224)===32)a.setInt16(0xb2,160,true);
   else{
    const event={address:0x4672d0,args:[id,26,a.getInt16(0xb6,true)===3?1:0]};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous fatigue reaction.');state=structuredClone(r.state);
   }
  }
 }
 a=actor();if(state.worldFlags&16){const p=state.destination;if(!p||![p.x,p.z].every(Number.isInteger))throw Error('Original walking override destination unavailable.');a.setInt32(8,p.x,true);a.setInt32(12,p.z,true);a.setInt16(0x1c,0,true);}
 if(a.getInt8(0x25)<7)a.setUint8(0x25,7);else{a.setUint8(0x25,a.getUint8(0x25)+1);if(a.getInt8(0x25)>10)a.setUint8(0x25,7);}
 return {state,calls,next:a.getInt32(0xec,true)===0?'skip':state.walkingOverride?'0x42d23c':'0x42b825'};
}
