import {originalMapDistance} from './original-route-distance.js';
import {originalHeading} from './original-heading.js';
import {originalTerrainByte} from './original-terrain-byte.js';
// 0x429f27–0x42a019: destination correction, arrival radius and initial facing.
export function originalWalkingArrivalGate(snapshot){
 const state=structuredClone(snapshot),id=state.actorId;
 function actor(index){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original arrival actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const a=actor(id);let {x,z}=state.destination??{};
 if(![x,z].every(Number.isInteger))throw Error('Original arrival destination unavailable.');
 if(a.getInt32(0xdc,true)!==0){const tx=x>>10,tz=z>>10,terrain=tx<0||tx>=50||tz<0||tz>=50?20:originalTerrainByte(state,tx,tz);if(terrain===17){x=a.getInt32(0xdc,true);z=a.getInt32(0xe0,true);}}
 const dx=(x-a.getInt32(8,true))|0,dz=(z-a.getInt32(12,true))|0,distance=originalMapDistance(dx,dz);
 const service=state.serviceIndex??-1;let radius=128;
 if(service!==-1){
  let bytes=state.facilityRecords,offset=service*16;
  if(offset<0){bytes=state.facilityPrefix;offset=(bytes?.length??0)+offset;}
  if(!(bytes instanceof Uint8Array)||offset<0||offset+2>bytes.length)throw Error('Original arrival facility storage unavailable.');
  const type=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getInt16(offset,true);if(type!==1)radius=512;
 }
 const result=next=>({state,destination:{x,z},delta:{x:dx,z:dz},distance,next});
 if(distance>=radius)return result('0x42a71c');
 a.setUint8(0x25,11);
 if(a.getInt32(0xdc,true)!==0){const p=actor(a.getInt16(0xaa,true)),heading=originalHeading((p.getInt32(0xdc,true)-a.getInt32(8,true))|0,(p.getInt32(0xe0,true)-a.getInt32(12,true))|0);a.setUint8(0x22,((((heading>>28)&15)+1)>>1)&7);}
 if(a.getUint32(0x18,true)&0x40000)return result('0x42bdb5');
 if(a.getUint8(0x29)===19){a.setUint8(0x29,0);return result('skip');}
 return result('0x42a019');
}
