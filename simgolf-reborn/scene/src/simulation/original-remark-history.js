// golf.exe 0x467448–0x4674c7. Offsets are relative to actor base 0x577f08.
// Preserve the packed record, including overlapping fields, until their full
// meaning can be mapped to the live authoritative actor schema.
export function originalRemarkHistory(record,kind,value) {
 if(!(record instanceof Uint8Array)||record.length!==256)
  throw new Error('Original remark history requires a 256-byte actor record.');
 const before=record.slice(),actor=record.slice();
 for(let index=9;index>0;index--){
  actor[0x70+index]=actor[0x70+index-1];
  actor[0x7a+index]=actor[0x7a+index-1];
  actor[0x88+index*2]=actor[0x88+(index-1)*2];
  actor[0x89+index*2]=actor[0x89+(index-1)*2];
 }
 actor[0x70]=kind;
 actor[0x7a]=actor[0x21]*11+actor[0x22]+((kind|0)>=4?1:0);
 new DataView(actor.buffer).setUint16(0x88,value,true);
 return {before,actor};
}
