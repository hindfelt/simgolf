import {originalNearestFacility} from './original-nearest-facility.js';
// 0x429aae–0x429b53 with distance rejection at 0x429c37.
export function originalWalkingPartnerService(snapshot){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(index){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original partner service actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const a=actor(id),p=actor(a.getInt16(0xaa,true)),clock=state.queueClock|0;
 let serviceIndex=state.serviceIndex??-1,destination=state.destination;
 const partnerAge=(clock-p.getInt16(0xc6,true))|0,ownAge=(clock-a.getInt16(0xc6,true))|0;
 if((partnerAge<=ownAge&&p.getUint8(0x2a)===0)||(a.getUint32(0x18,true)&0x4000000))return {state,calls,serviceIndex,destination,next:'0x429c40'};
 const origin={x:a.getInt32(8,true),z:a.getInt32(12,true)};
 calls.push({address:0x40daa0,args:[3,origin.x,origin.z]});
 const r=originalNearestFacility(state,3,origin);state=r.state;serviceIndex=r.value;
 if(state.nearestFacilityDistance>=3072)return {state,calls,serviceIndex:-1,destination,next:'0x429c49'};
 const b=state.facilityRecords,v=new DataView(b.buffer,b.byteOffset,b.byteLength),off=serviceIndex*16;
 destination={x:(v.getInt16(off+2,true)<<10)+512,z:(v.getInt16(off+4,true)<<10)+512};
 return {state,calls,serviceIndex,destination,next:'0x429c40'};
}
