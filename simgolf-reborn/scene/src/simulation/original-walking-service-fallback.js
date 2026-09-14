import {originalNearestServiceTile} from './original-nearest-service-tile.js';
// 0x4299c0–0x429aae; alternate entry at 0x429a84 clears the primary flag.
export function originalWalkingServiceFallback(snapshot){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original fallback actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let a=actor();if(state.skipPrimaryService)a.setUint32(0x18,a.getUint32(0x18,true)&~0x2000,true);
 let serviceIndex=state.serviceIndex??-1,destination=state.destination;
 const counter=a.getInt16(0xb2,true),flags=a.getUint32(0x18,true);
 if(counter!==0&&(Math.trunc(counter/20)>=((6-(state.waitingGroups|0))|0)||(flags&0x1000))){
  const origin={x:a.getInt32(8,true),z:a.getInt32(12,true)},radius=flags&0x2000000?4:2;
  calls.push({address:0x40db60,args:[origin.x,origin.z,radius]});
  state=originalNearestServiceTile(state,origin,radius).state;a=actor();
  if(state.serviceTileX!==-1){
   destination={x:(state.serviceTileX<<10)+512,z:(state.serviceTileZ<<10)+512};serviceIndex=-2;
   a.setUint32(0x18,a.getUint32(0x18,true)|0x2000000,true);
   return {state,calls,serviceIndex,destination,next:'0x429b5f'};
  }
  a.setUint32(0x18,a.getUint32(0x18,true)&~0x2000000,true);serviceIndex=-1;
 }
 return {state,calls,serviceIndex,destination,next:'0x429aae'};
}
