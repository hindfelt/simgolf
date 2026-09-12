import {originalMapDistance} from './original-route-distance.js';
// Native 0x42ca9d–0x42cc88 after the stop predicate has zeroed speed.
// Hole records are native 520-byte records; statistic records are 184 bytes.
export function originalShotAccounting(snapshot){
 const state=structuredClone(snapshot),id=state.actorId;
 function view(bytes,size,name){if(!(bytes instanceof Uint8Array)||bytes.length!==size)throw Error(`Original ${name} record is unavailable.`);return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);}
 if(!Number.isInteger(id)||id<0||id>=152)throw Error('Invalid original accounting actor.');
 const a=view(state.actors?.[id],256,'actor');
 if(a.getInt32(0xec,true)!==0||a.getInt32(0xe4,true)!==0||a.getInt32(0xf0,true)!==0)throw Error('Original shot accounting requires a stopped ball.');
 a.setInt16(0xa6,0,true);a.setUint8(0x28,0);a.setUint32(0x18,a.getUint32(0x18,true)&0xfffbffff,true);
 const tile={x:a.getInt32(0xdc,true)>>10,z:a.getInt32(0xe0,true)>>10},index=tile.x*50+tile.z;
 if(!(state.terrain instanceof Uint8Array)||index<0||index>=state.terrain.length)throw Error('Original stopped-ball terrain is unavailable.');
 const terrain=(state.terrain[index]<<24)>>24;
 if(terrain!==2)a.setUint32(0x18,a.getUint32(0x18,true)&0xfbffffff,true);
 const holeId=a.getInt8(0x29),h=view(state.holeRecords?.[holeId],520,'hole');
 const statIndex=a.getInt8(0xc2)+(a.getUint8(0x21)&7)*4;
 const stat=()=>view(state.statRecords?.[statIndex],184,'statistics');
 let driveDistance=null;
 if(a.getUint8(0x2a)===0){
  h.setUint32(0x20,h.getUint32(0x20,true)+1,true);
  const s=stat();s.setUint32(0x10,s.getUint32(0x10,true)+1,true);
  const distance=originalMapDistance((a.getInt32(0xdc,true)-a.getInt32(0xcc,true))|0,(a.getInt32(0xe0,true)-a.getInt32(0xd0,true))|0);
  driveDistance=Math.trunc((Math.imul(distance,25)|0)/1024);
  s.setInt32(0,(s.getInt32(0,true)+driveDistance)|0,true);
  if(s.getInt32(0x14,true)<driveDistance)s.setInt32(0x14,driveDistance,true);
  h.setUint16(0x15c,h.getUint16(0x15c,true)+driveDistance,true);
  if(driveDistance>h.getInt16(0x166,true))h.setInt16(0x166,driveDistance,true);
  const scatter=state.metadata?.[terrain]?.scatterCoefficient;
  if(!Number.isInteger(scatter)||scatter< -128||scatter>127)throw Error('Original terrain statistic metadata is unavailable.');
  if(scatter<=0){s.setUint32(4,s.getUint32(4,true)+1,true);h.setUint16(0x15e,h.getUint16(0x15e,true)+1,true);}
 }
 a.setUint8(0x2a,a.getUint8(0x2a)+1);
 const greenInRegulation=a.getInt8(0x2a)===h.getInt8(0)-2&&terrain===1;
 if(greenInRegulation){const s=stat();s.setUint32(8,s.getUint32(8,true)+1,true);h.setUint16(0x160,h.getUint16(0x160,true)+1,true);}
 return {state,tile,index,terrain,driveDistance,greenInRegulation,next:'0x42cc88'};
}
