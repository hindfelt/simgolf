import {originalNearestFacility} from './original-nearest-facility.js';
// 0x429947–0x4299c0 (including rejection at 0x429a6f).
export function originalWalkingServiceSearch(snapshot){
 const id=snapshot.actorId,b=snapshot.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original service actor unavailable.');
 const initial=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const origin={x:initial.getInt32(8,true),z:initial.getInt32(12,true)};
 const result=originalNearestFacility(snapshot,7,origin),state=result.state;
 const bytes=state.actors[id],a=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),flags=a.getUint32(0x18,true);
 const calls=[{address:0x40daa0,args:[7,origin.x,origin.z]}];
 const limit=(((flags&0x2000)|0x8000)>>>12)<<10;
 if(state.nearestFacilityDistance>=limit){
  a.setUint32(0x18,flags&~0x2000,true);
  return {state,calls,serviceIndex:-1,destination:state.destination,next:'0x4299c0'};
 }
 a.setUint32(0x18,flags|0x2000,true);
 // The real search cannot return -1 with distance below this limit.
 if(result.value<0)throw Error('Inconsistent original facility search result.');
 const records=state.facilityRecords,v=new DataView(records.buffer,records.byteOffset,records.byteLength),off=result.value*16;
 const destination={x:(v.getInt16(off+2,true)<<10)+512,z:(v.getInt16(off+4,true)<<10)+512};
 return {state,calls,serviceIndex:result.value,destination,next:'0x429b53'};
}
