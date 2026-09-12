import {originalRandom} from './original-rng.js';
import {originalHeading} from './original-heading.js';
import {originalRouteSegment} from './original-route-distance.js';

// Native 0x42b825–0x42bb3b: phase dispatch and full 152-slot clearance scan.
export function originalSwingClearance(snapshot){
 const state=structuredClone(snapshot),id=state.actorId;let randomDraws=0,corridorClear=null;
 function actor(index){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original clearance actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const a=actor(id),done=next=>({state,randomDraws,corridorClear,next}),phase=a.getUint8(0x28);
 if(phase===0)return done('motion');if(phase!==1)return done('progress');
 if(a.getUint8(0x25)===16)return done('skip');
 a.setUint8(0x25,11);
 const partner=a.getInt16(0xaa,true);
 const partnerReady=a.getUint8(0x2a)===0&&(id&1)&&actor(partner).getInt16(0xa6,true)>=0;
 function draw(bound){const rng=originalRandom(state.seed),value=rng.next(bound||1);state.seed=rng.state;randomDraws+=rng.draws;return bound?value:0;}
 if(!Number.isInteger(state.swingOverride)||!Number.isInteger(state.ballTerrain))throw Error('Original clearance timing context is unavailable.');
 if(!partnerReady&&state.swingOverride===0){
  const bound=state.ballTerrain===1?0:(a.getInt8(0x29)+4)&0xffff;
  if(draw(bound)!==0&&!(a.getUint32(0x18,true)&0x4200))return done('skip');
 }
 a.setUint8(0x22,((((a.getInt32(0xe8,true)>>28)&15)+1)>>1)&7);
 if(!Number.isInteger(state.roundClock))throw Error('Original clearance round clock is unavailable.');
 corridorClear=true;
 const position=v=>({x:v.getInt32(8,true),z:v.getInt32(12,true)}),target={x:a.getInt32(0xd4,true),z:a.getInt32(0xd8,true)};
 for(let slot=0;slot<152;slot++){
  const other=actor(slot);
  if(other.getUint8(0x29)!==a.getUint8(0x29)||((state.roundClock-other.getInt16(0xc6,true))|0)<((state.roundClock-a.getInt16(0xc6,true))|0)||slot===partner||slot===id||!(other.getUint32(0x18,true)&0x400)||other.getInt8(0x2a)<=a.getInt8(0x2a))continue;
  const tee=state.holeTees?.[a.getInt8(0x29)],otherPosition=position(other);
  const teeDistance=originalRouteSegment(otherPosition,tee);
  if(teeDistance<100){corridorClear=false;continue;}
  if(originalRouteSegment({x:other.getInt32(0xdc,true),z:other.getInt32(0xe0,true)},target)<37)corridorClear=false;
  if(originalRouteSegment(otherPosition,target)<37){corridorClear=false;continue;}
  if(!corridorClear)continue;
  const from=position(a);
  if(teeDistance>=originalRouteSegment(from,target))continue;
  const direction=originalHeading((otherPosition.x-from.x)|0,(otherPosition.z-from.z)|0),aim=originalHeading(((target.x<<10)+512-from.x)|0,((target.z<<10)+512-from.z)|0);
  if((Math.abs((direction-aim)|0)|0)<0xaaaaaaa)corridorClear=false;
 }
 if(!(a.getUint32(0x18,true)&0x200)&&!corridorClear){a.setUint8(0x25,11);a.setInt16(0x1c,0,true);a.setInt16(0xa6,-draw(4),true);return done('skip');}
 a.setUint8(0x25,16);a.setUint8(0x26,0);a.setInt32(8,a.getInt32(0xdc,true),true);a.setInt32(12,a.getInt32(0xe0,true),true);a.setUint32(0x18,a.getUint32(0x18,true)&0xfffdffff,true);
 return done('skip');
}
