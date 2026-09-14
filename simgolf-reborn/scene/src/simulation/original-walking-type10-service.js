import {originalNearestFacility} from './original-nearest-facility.js';
// 0x429d3d–0x429e24: final optional facility, or selected-service continuation.
export function originalWalkingType10Service(snapshot){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original service actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let a=actor(),serviceIndex=state.serviceIndex??-1,destination=state.destination;
 const result=next=>({state,calls,serviceIndex,destination,next});
 if(!['0x429d3d','0x429e0d'].includes(state.serviceEntry))throw Error('Original final service entry unavailable.');
 if(state.serviceEntry==='0x429e0d'||a.getUint8(0x2a)!==0){a.setUint32(0x18,a.getUint32(0x18,true)&~32,true);return result(serviceIndex!==-1?'0x429f27':'0x429e24');}
 if((a.getUint8(0x18)&4)||!(a.getUint8(0x21)&1)||a.getUint8(0x20)!==0||!state.type10Available)return result('0x429e24');
 const origin={x:a.getInt32(8,true),z:a.getInt32(12,true)};calls.push({address:0x40daa0,args:[10,origin.x,origin.z]});
 const r=originalNearestFacility(state,10,origin);state=r.state;serviceIndex=r.value;a=actor();const flags=a.getUint32(0x18,true);
 if(state.nearestFacilityDistance>=((flags&32?9:6)<<10)){serviceIndex=-1;a.setUint32(0x18,flags&~32,true);return result('0x429e24');}
 const b=state.facilityRecords,v=new DataView(b.buffer,b.byteOffset,b.byteLength),off=serviceIndex*16,parity=id&1;
 destination={x:((v.getInt16(off+2,true)+parity)<<10)+2560,z:((v.getInt16(off+4,true)+parity)<<10)+2560};a.setUint32(0x18,flags|32,true);
 return result('0x429f27');
}
