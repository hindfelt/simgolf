import {originalNearestFacility} from './original-nearest-facility.js';
// 0x429c40–0x429d13: optional type-6 service before the first stroke.
export function originalWalkingType6Service(snapshot){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original service actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let a=actor(),serviceIndex=state.serviceIndex??-1,destination=state.destination;
 const result=next=>({state,calls,serviceIndex,destination,next});
 if(serviceIndex!==-1||a.getUint8(0x2a)!==0)return result('0x429b5f');
 a.setUint8(0x24,0);
 if((a.getUint8(0x18)&16)||!(a.getUint8(0x21)&4)||a.getUint8(0x20)!==0||!state.type6Available)return result('0x429b76');
 const origin={x:a.getInt32(8,true),z:a.getInt32(12,true)};
 calls.push({address:0x40daa0,args:[6,origin.x,origin.z]});
 const r=originalNearestFacility(state,6,origin);state=r.state;serviceIndex=r.value;a=actor();const flags=a.getUint32(0x18,true);
 if(state.nearestFacilityDistance>=((((flags&64)|160)>>>5)<<10)){
  serviceIndex=-1;a.setUint32(0x18,flags&~64,true);return result('0x429b76');
 }
 const b=state.facilityRecords,v=new DataView(b.buffer,b.byteOffset,b.byteLength),off=serviceIndex*16,parity=id&1;
 destination={x:(v.getInt16(off+2,true)+parity+1)<<10,z:(v.getInt16(off+4,true)+parity+1)<<10};
 a.setUint32(0x18,flags|64,true);
 return result('0x429b70');
}
