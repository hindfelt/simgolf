const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
// 0x42af66–0x42b17c: walking/cart rate and activation sound.
export function originalWalkingRate(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(index=id){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original walking-rate actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let a=actor();if(a.getInt16(0xa6,true)<0||a.getUint8(0x22)===255)return {state,calls,next:'0x4295e6'};
 const metadata=state.metadata?.[state.nextTerrain];if(!metadata||!Number.isInteger(metadata.walkingCost))throw Error('Original walking cost unavailable.');
 const cost=(metadata.walkingCost<<24)>>24,upper=a.getInt16(0xb2,true)<160?5:3;
 let rate=Math.min(upper,Math.max(3,6-cost));
 if(id===state.selectionState||a.getInt16(0xaa,true)===state.selectionState||(a.getUint32(0x18,true)&0x4000)||(state.worldFlags&0x200000))rate++;
 function tileFlags(index){const flags=state.tileFlags;if(!(flags instanceof Uint16Array)||flags.length!==2500||!Number.isInteger(index))throw Error('Original walking path flags unavailable.');if(index>=0&&index<2500)return flags[index];const bytes=index<0?state.tileFlagsPrefix:state.tileFlagsSuffix,offset=index<0?(bytes?.length??0)+index:index-2500;if(!(bytes instanceof Uint16Array)||offset<0||offset>=bytes.length)throw Error('Original adjacent path flags unavailable.');return bytes[offset];}
 const facing=a.getInt8(0x22);if(facing<0||facing>7)throw Error('Original walking-rate facing unavailable.');
 if((tileFlags(state.actorIndex)&32)||(state.cachedFlags&0x8000)){
  const tile=state.actorTile;if(!tile||![tile.x,tile.z].every(Number.isInteger))throw Error('Original walking tile unavailable.');
  const forward=(tile.x+DX[facing])*50+tile.z+DZ[facing],back=(tile.x-DX[facing])*50+tile.z-DZ[facing];
  if((tileFlags(forward)&32)||(tileFlags(back)&32)){
   rate=6;
   if(a.getUint32(0x18,true)&0x10000){const threshold=a.getUint8(0x2a)===0&&(state.cachedFlags&0x8000)?-1:0;if(!Number.isInteger(metadata.shotClass))throw Error('Original walking terrain class unavailable.');if(((metadata.shotClass<<24)>>24)>threshold)a.setUint32(0x18,a.getUint32(0x18,true)|0x8000,true);}
  }
 }
 if(((state.phaseCounter>>4)&3)===(id&3))rate++;
 if((a.getUint32(0x18,true)&0x10000)&&a.getInt8(0x2a)<=1&&actor(a.getInt16(0xaa,true)).getInt8(0x2a)<=1)a.setUint32(0x18,a.getUint32(0x18,true)|0x8000,true);
 if(state.nextTerrain===0||state.nextTerrain===1||state.distance<1024)a.setUint32(0x18,a.getUint32(0x18,true)&~0x8000,true);
 if(a.getUint32(0x18,true)&0x8000){
  if(!Number.isInteger(state.cartUpgrade))throw Error('Original cart upgrade unavailable.');rate=(Math.imul(state.cartUpgrade,4)+8)|0;
  if(a.getInt16(0xb2,true)>40)a.setInt16(0xb2,40,true);
  if(!(state.cachedFlags&0x8000)){
   const event={address:0x40c1f0,args:[49,a.getInt32(8,true),a.getInt32(12,true),0]};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous walking sound.');state=structuredClone(r.state);
  }
 }
 return {state,calls,walkingRate:rate,next:'0x42b17c'};
}
