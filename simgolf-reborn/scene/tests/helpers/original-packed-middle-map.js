import {middleMap} from './original-auto-middle-map.js';
import {originalPlannerWorldRecords} from '../../src/simulation/original-planner-world-records.js';
// Pack the same controlled records used by the native middle-stage oracle.
export function packedMiddleMap(q){
 const map=middleMap(q),facilityRecords=new Uint8Array(4096),v=new DataView(facilityRecords.buffer);
 for(let i=0;i<256;i++){const r=map.objectAt(i);v.setInt16(i*16,r.type,true);v.setInt16(i*16+2,r.x,true);v.setInt16(i*16+4,r.z,true);v.setInt32(i*16+8,r.value,true);}
 const objectPrefixRecord=new Uint8Array(16),prefix=new DataView(objectPrefixRecord.buffer);prefix.setInt16(0,q.missingRecord.type,true);prefix.setInt32(8,q.missingRecord.value,true);
 const actors=Array.from({length:152},()=>new Uint8Array(256));
 for(let id=0;id<152;id++)new DataView(actors[id].buffer).setInt16(0xbe,map.profileIndexFor(id),true);
 const records=originalPlannerWorldRecords({actors,facilityRecords,objectPrefixRecord,
  objectBaseSizes:Int8Array.from({length:8},(_,i)=>i>=4?map.baseSizeAt(i):0),objectExpansions:Int32Array.from({length:8},(_,i)=>map.expansionAt(i)),
  metadata:Array.from({length:23},(_,i)=>({shape:map.categoryAt(i)})),
  holes:Array.from({length:20},()=>{const b=new Uint8Array(520);new DataView(b.buffer).setInt32(0x1fc,q.holeRecord,true);return b;}),
  completionRecords:Array.from({length:q.profileBytes.length},()=>{const b=new Uint8Array(44);b.fill(q.profileHoleMark,22);return b;}),
  profileRecords:q.profileBytes.map(n=>{const b=new Uint8Array(560);b[33]=n;return b;}),
 });
 return {...map,...records};
}
