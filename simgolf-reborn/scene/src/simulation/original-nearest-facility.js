import {originalMapDistance} from './original-route-distance.js';

// 0x40daa0–0x40db56. Native ordered 256-record search, including early stop.
export function originalNearestFacility(snapshot, type, origin){
 const state=structuredClone(snapshot),records=state.facilityRecords;
 if(!(records instanceof Uint8Array)||records.length!==4096||!Number.isInteger(type)||!origin||![origin.x,origin.z].every(Number.isInteger))throw Error('Original facility search data unavailable.');
 const view=new DataView(records.buffer,records.byteOffset,records.byteLength);
 let index=-1;state.nearestFacilityDistance=65535;
 for(let i=0;i<256;i++){
  const off=i*16;
  if(view.getInt16(off,true)!==type)continue;
  if(type>=6&&!(records[off+7]&64))break;
  const width=state.facilityWidths?.[type];
  if(!Number.isInteger(width)||width < -128||width>127)throw Error('Original facility width unavailable.');
  const half=Math.trunc(width/2);
  const x=(((view.getInt16(off+2,true)+half)<<10)+512-origin.x)|0;
  const z=(((view.getInt16(off+4,true)+half)<<10)+512-origin.z)|0;
  const distance=originalMapDistance(x,z);
  if(distance<state.nearestFacilityDistance){state.nearestFacilityDistance=distance;index=i;}
 }
 return {state,value:index};
}
