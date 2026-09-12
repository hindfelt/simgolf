// Native planner's record reads. Profile selection here is actor +0xbe,
// distinct from the +0xb6 profile used by speech preparation.
export function originalPlannerWorldRecords(state){
 const view=(rows,index,size,label)=>{
  const b=rows?.[index];
  if(!Number.isInteger(index)||index<0||!(b instanceof Uint8Array)||b.length!==size)throw Error(`Original planner ${label} unavailable.`);
  return new DataView(b.buffer,b.byteOffset,b.byteLength);
 };
 return {
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
