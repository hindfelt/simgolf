// Native planner's record reads. Profile selection here is actor +0xbe,
// distinct from the +0xb6 profile used by speech preparation.
export function originalPlannerWorldRecords(state){
 const view=(rows,index,size,label)=>{
  const b=rows?.[index];
  if(!Number.isInteger(index)||index<0||!(b instanceof Uint8Array)||b.length!==size)throw Error(`Original planner ${label} unavailable.`);
  return new DataView(b.buffer,b.byteOffset,b.byteLength);
 };
 const indexed=(array,index,Type,label)=>{
  if(!(array instanceof Type)||!Number.isInteger(index)||index<0||index>=array.length)throw Error(`Original planner ${label} unavailable.`);
  return array[index];
 };
 return {
  baseSizeAt:type=>indexed(state.objectBaseSizes,type,Int8Array,'object size'),
  expansionAt:type=>indexed(state.objectExpansions,type,Int32Array,'object expansion'),
  objectAt:index=>{
   let b;
   if(index===-1)b=state.objectPrefixRecord;
   else{
    if(!Number.isInteger(index)||index<0||index>=256||!(state.facilityRecords instanceof Uint8Array)||state.facilityRecords.length!==4096)throw Error('Original planner object table unavailable.');
    b=state.facilityRecords.subarray(index*16,index*16+16);
   }
   if(!(b instanceof Uint8Array)||b.length!==16)throw Error('Original planner preceding object record unavailable.');
   const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
   return {type:v.getInt16(0,true),x:v.getInt16(2,true),z:v.getInt16(4,true),value:v.getInt32(8,true)};
  },
  // 0x424b52 reads metadata byte 7 (shape), not the catalog category.
  categoryAt:code=>{
   const shape=state.metadata?.[code]?.shape;
   if(!Number.isInteger(shape)||shape<0||shape>255)throw Error('Original planner terrain shape unavailable.');
   return shape;
  },
  holeRecordAt:hole=>view(state.holes,hole,520,'hole record').getInt32(0x1fc,true),
  profileHoleMarkAt:(profile,hole)=>{
   if(!Number.isInteger(hole)||hole<0||hole>=22)throw Error('Original planner profile hole unavailable.');
   return view(state.completionRecords,profile,44,'completion record').getUint8(22+hole);
  },
  profileIndexFor:id=>view(state.actors,id,256,'actor record').getInt16(0xbe,true),
  profileByteAt:index=>view(state.profileRecords,index,560,'profile record').getUint8(0x21),
 };
}
