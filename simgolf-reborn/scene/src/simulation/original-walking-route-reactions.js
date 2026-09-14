// 0x42abda–0x42ad32: route budget scaling, terrain and steepness reactions.
export function originalWalkingRouteReactions(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original route actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function effect(address,args){const event={address,args};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous route reaction.');state=structuredClone(r.state);return r.value;}
 function metadata(code){const value=state.metadata?.[code]?.shotClass;if(!Number.isInteger(value))throw Error('Original route terrain metadata unavailable.');return (value<<24)>>24;}
 let a=actor();a.setInt16(0x1c,a.getInt16(0x1c,true)<<6,true);
 const next=state.nextTerrain;let clear=true;
 if(state.difficulty!==0&&a.getInt8(0x2a)<=1&&a.getUint8(0x29)!==19&&metadata(state.ballTerrain)<=0&&(a.getUint8(0x2a)===0||!(a.getUint32(0x18,true)&0x800))){
  const index=state.actorIndex;if(!(state.tileFlags instanceof Uint16Array)||!Number.isInteger(index)||index<0||index>=2500)throw Error('Original route tile flags unavailable.');
  if(!(state.tileFlags[index]&32)&&next!==22&&metadata(next)>1){
   if((a.getUint8(0x22)&1)||next===7)clear=false;
   else if((a.getUint32(0x18,true)&0x40000000)&&a.getUint8(0x8d)!==10)effect(0x4672d0,[id,10,next]);
   else {a.setUint32(0x18,a.getUint32(0x18,true)|0x40000000,true);clear=false;}
  }
 }
 a=actor();if(clear)a.setUint32(0x18,a.getUint32(0x18,true)&~0x40000000,true);
 if(a.getUint8(0x29)!==19&&!(a.getUint32(0x18,true)&0x8000)&&a.getUint8(0x8d)!==43&&!(a.getUint8(0x22)&1)){
  const query=()=>{const v=actor();return effect(0x40c140,[v.getInt32(8,true),v.getInt32(12,true),v.getInt8(0x22)]);};
  if(query()>2){const slope=query();effect(0x4672d0,[id,43,slope]);}
 }
 return {state,calls,next:'0x42a75c'};
}
