// 0x40f908–0x40f9cf: aggregate 256 packed building records, then clear type 7.
export function originalFacilityLevels(records){
 if(!(records instanceof Uint8Array)||records.length!==4096)throw Error('Original building records are unavailable.');
 const r=new DataView(records.buffer,records.byteOffset,records.byteLength),levels=Array(20).fill(0),activeLevels=Array(20).fill(0);let activeMask=0;
 for(let i=0;i<4096;i+=16){
  const type=r.getInt16(i,true);if(type<6)continue;
  if(type>=20)throw Error('Original building type is outside the level tables.');
  const minimum=(r.getInt32(i+8,true)+1)|0;
  const clamp=v=>{v=Math.max(v,minimum);return v>99&&minimum<=99?99:v;};
  levels[type]=clamp(levels[type]);
  if(records[i+7]&0x40){activeLevels[type]=clamp(activeLevels[type]);activeMask=(activeMask|(1<<type))>>>0;}
 }
 levels[7]=0;activeLevels[7]=0;
 return {levels,activeLevels,activeMask};
}
