import {originalHeading} from './original-heading.js';
import {originalMapDistance} from './original-route-distance.js';
import {originalRandom} from './original-rng.js';
// 0x42a168–0x42a1f7 and 0x42a52b–0x42a71c.
export function originalArrivalPartner(snapshot){
 const state=structuredClone(snapshot),id=state.actorId;let randomDraws=0;
 function actor(i){const b=state.actors?.[i];if(!Number.isInteger(i)||i<0||i>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original arrival partner unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const a=actor(id),partnerId=a.getInt16(0xaa,true),p=actor(partnerId),hole=p.getUint8(0x29);
 const done=next=>({state,randomDraws,next});
 function face(){a.setUint8(0x25,11);const h=originalHeading((p.getInt32(8,true)-a.getInt32(8,true))|0,(p.getInt32(12,true)-a.getInt32(12,true))|0);a.setUint8(0x22,((((h>>28)&15)+1)>>1)&7);}
 if(hole!==0&&a.getInt32(0xdc,true)===0&&p.getInt32(0xdc,true)!==0&&a.getInt8(0x29)>p.getInt8(0x29)){face();a.setInt16(0x1c,0,true);return done('skip');}
 if(hole!==0&&a.getUint8(0x29)===hole&&a.getInt32(0xec,true)===0){
  const flags=a.getUint32(0x18,true),zero=p.getUint8(0x2a)===0;
  if((id<partnerId&&zero&&!(flags&0x4000))||(id>partnerId&&(flags&0x400)&&zero)){
   face();a.setInt16(0x1c,0,true);const rng=originalRandom(state.seed);a.setInt16(0xa6,-4-rng.next(4),true);state.seed=rng.state;randomDraws++;return done('skip');
  }
 }
 const hb=state.holes?.[a.getInt8(0x29)];if(!(hb instanceof Uint8Array)||hb.length!==520)throw Error('Original arrival hole unavailable.');
 const h=new DataView(hb.buffer,hb.byteOffset,hb.byteLength),cx=((h.getInt32(0x18,true)<<10)+512)|0,cz=((h.getInt32(0x1c,true)<<10)+512)|0;
 // Native compares own distance with partner Z offset here, not partner distance.
 if(hole===a.getUint8(0x29)&&p.getUint8(0x2a)!==0&&a.getInt32(0xdc,true)!==0&&originalMapDistance((a.getInt32(0xdc,true)-cx)|0,(a.getInt32(0xe0,true)-cz)|0)<((p.getInt32(0xe0,true)-cz)|0)){face();return done('0x42badc');}
 a.setInt32(0xd4,0,true);
 if(!state.walkingOverride&&state.movementReady&&!state.waitingGroups){
  if(a.getInt32(0xdc,true)===0){const p=state.startBall;if(!p||![p.x,p.z].every(Number.isInteger))throw Error('Original starting ball coordinates unavailable.');a.setInt32(0xdc,p.x,true);a.setInt32(0xe0,p.z,true);}
  a.setUint8(0x28,1);
 }
 a.setInt16(0x1c,0,true);a.setInt32(0xf0,0,true);a.setInt32(0xec,0,true);a.setInt32(0xe4,0,true);
 return done('0x42b3d8');
}
