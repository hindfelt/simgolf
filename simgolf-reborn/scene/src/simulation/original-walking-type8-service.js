import {originalNearestFacility} from './original-nearest-facility.js';
// Entries 0x429b53/b5f/b70/b76 through type-8 selection and 0x429d3d/e0d.
export function originalWalkingType8Service(snapshot){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original service actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let a=actor(),serviceIndex=state.serviceIndex??-1,destination=state.destination;
 const entry=state.serviceEntry;
 if(!['0x429b53','0x429b5f','0x429b70','0x429b76'].includes(entry))throw Error('Original service entry unavailable.');
 const result=next=>({state,calls,serviceIndex,destination,next});
 if(entry==='0x429b53')a.setUint32(0x18,a.getUint32(0x18,true)&~0x2000000,true);
 if(entry==='0x429b53'||entry==='0x429b5f')a.setUint32(0x18,a.getUint32(0x18,true)&~64,true);
 if((entry!=='0x429b76'&&serviceIndex!==-1)||a.getUint8(0x2a)!==0){
  a.setUint32(0x18,a.getUint32(0x18,true)&~256,true);return result(serviceIndex!==-1?'0x429e0d':'0x429d3d');
 }
 if((a.getUint8(0x18)&8)||!(a.getUint8(0x21)&2)||a.getUint8(0x20)!==0||!state.type8Available)return result('0x429d3d');
 const origin={x:a.getInt32(8,true),z:a.getInt32(12,true)};calls.push({address:0x40daa0,args:[8,origin.x,origin.z]});
 const r=originalNearestFacility(state,8,origin);state=r.state;serviceIndex=r.value;a=actor();const flags=a.getUint32(0x18,true);
 if(state.nearestFacilityDistance>=((((flags&256)|640)>>>7)<<10)){
  serviceIndex=-1;a.setUint32(0x18,flags&~256,true);return result('0x429d3d');
 }
 const b=state.facilityRecords,v=new DataView(b.buffer,b.byteOffset,b.byteLength),off=serviceIndex*16,parity=id&1;
 destination={x:((v.getInt16(off+2,true)+parity)<<10)+512,z:((v.getInt16(off+4,true)+parity)<<10)+512};a.setUint32(0x18,flags|256,true);
 return result('0x429e0d');
}
