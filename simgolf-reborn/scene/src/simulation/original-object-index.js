// 0x40dc70–0x40dce6: first covering record in the original 256-slot table.
// Base sizes are signed metadata bytes; type 7 excludes expansion adjustment.
export function originalObjectIndex(x,z,objects) {
 for(let index=0;index<256;index++){
  const record=objects.objectAt(index);
  if(record.type===-1)continue;
  let size=objects.baseSizeAt(record.type);
  if(record.type>=6&&record.type!==7)size=(size+objects.expansionAt(record.type)-1)|0;
  if(x>=record.x&&x<((record.x+size)|0)&&z>=record.z&&z<((record.z+size)|0))return index;
 }
 return -1;
}
