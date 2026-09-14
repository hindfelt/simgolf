// 0x402c6f–0x402ebd: destination setup and flagged-tile/motion-record scan.
export function originalVisualDestination(snapshot,slot){
 const state=structuredClone(snapshot),bytes=state.visualRecords?.[slot];
 if(!Number.isInteger(slot)||slot<0||slot>=64||!(bytes instanceof Uint8Array)||bytes.length!==76)throw Error('Original visual destination slot unavailable.');
 const r=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),kind=r.getUint8(0x13),flags=r.getUint8(0x12);
 if(kind===250){
  if(!Number.isInteger(state.selectedActor)||!Number.isInteger(state.worldFlags))throw Error('Original visual selection unavailable.');
  if(state.selectedActor!==-1)return {state,next:'skip'};
  if(state.worldFlags&0x200000){const actor=state.actors?.[1];if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original second actor unavailable.');if(actor[0x29]!==0)return {state,next:'skip'};}
 }
 if(r.getInt16(0x18,true)!==0||(flags&16))return {state,next:'0x403480'};
 const homeX=r.getInt8(0x10),homeZ=r.getInt8(0x11),px=r.getInt32(0,true),pz=r.getInt32(4,true);
 const locals={x:homeX===-1?px:(homeX<<10)+512,z:homeX===-1?pz:(homeZ<<10)+512,selection:-1,kind:-1,index:-1,distance:0xfffff};
 if(kind!==252&&kind!==250)return {state,locals,next:'0x402ebd'};
 if(!(state.terrain instanceof Uint8Array)||state.terrain.length!==2500||!(state.tileFlags instanceof Uint16Array)||state.tileFlags.length!==2500)throw Error('Original destination map unavailable.');
 const distance=(x,z)=>{const ax=Math.abs(x)|0,az=Math.abs(z)|0;return Math.trunc(((ax>az?az+Math.imul(ax,2):ax+Math.imul(az,2))|0)/2);};
 let best=flags&8?32:24;
 for(let dx=-16;dx<=16;dx++)for(let dz=-16;dz<=16;dz++){
  const x=homeX+dx,z=homeZ+dz;if(x<0||x>=50||z<0||z>=50)continue;
  const i=x*50+z;if(state.terrain[i]===20||!(state.tileFlags[i]&0x800))continue;
  const d=distance((2*x-homeX-(px>>10))|0,(2*z-homeZ-(pz>>10))|0);
  if(d>=best)continue;best=d;Object.assign(locals,{x:(x<<10)+512,z:(z<<10)+512,selection:1,kind:-4,index:x,row:z});
 }
 if(locals.selection===-1&&(flags&8)){
  if(!(state.motionRecords instanceof Int32Array)||state.motionRecords.length!==2304||!(state.motionPrefix instanceof Int32Array)||state.motionPrefix.length!==2)throw Error('Original preceding motion storage unavailable.');
  const word=i=>i<0?state.motionPrefix[i+2]:state.motionRecords[i];best=5120;
  for(let i=0;i<256;i++){
   if(word(i*9)===-1)continue;
   const x=word(i*9-2),z=word(i*9-1);
   // Native code subtracts the visual X coordinate from both components.
   const d=distance((2*x-512-(homeX<<10)-px)|0,(2*z-512-(homeZ<<10)-px)|0);
   if(d>=best)continue;best=d;Object.assign(locals,{x,z,selection:2,kind:-4,index:i});
  }
 }
 return {state,locals,next:'0x402ebd'};
}
