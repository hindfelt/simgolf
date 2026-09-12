import {originalRandom} from './original-rng.js';
import {originalHeading} from './original-heading.js';
import {originalRouteSegment} from './original-route-distance.js';
// 0x42c815–0x42c9ea. Sounds precede luck eligibility and heading correction.
export function originalActorLandingDeflection(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;let randomDraws=0,luckAdjusted=false;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original landing actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function target(){const hole=actor().getInt8(0x29),b=state.holes?.[hole];if(!(b instanceof Uint8Array)||b.length!==520)throw Error('Original landing hole unavailable.');const h=new DataView(b.buffer,b.byteOffset,b.byteLength);return {x:h.getInt32(0x18,true),z:h.getInt32(0x1c,true)};}
 function draw(bound){const rng=originalRandom(state.seed),value=rng.next(bound);state.seed=rng.state;randomDraws++;return value;}
 function call(address,args){const e={address,args};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original landing effect.');state=structuredClone(r.state);}
 let a=actor();
 if(snapshot.ballTerrain===12&&a.getInt32(0xec,true)>256&&snapshot.boundaryFlags===0){
  const half=a.getUint8(0x20)!==0&&(a.getUint16(0x1e,true)&512)?40:80;
  a.setUint32(0xe8,a.getUint32(0xe8,true)+((half-draw(half*2))<<24),true);
  const sound=6+draw(3);call(0x40c1f0,[sound,a.getInt32(0xdc,true),a.getInt32(0xe0,true),0]);
 }
 a=actor();
 if(a.getInt32(0xec,true)>256&&a.getUint8(0x20)!==0&&draw(100)<state.luck&&originalRouteSegment({x:a.getInt32(0xdc,true),z:a.getInt32(0xe0,true)},target())<75&&state.scatterCoefficient<=0){
  call(0x40c1f0,[24,a.getInt32(0xdc,true),a.getInt32(0xe0,true),0]);a=actor();const t=target(),heading=a.getUint32(0xe8,true),aim=originalHeading(((t.x<<10)+512-a.getInt32(0xdc,true))|0,((t.z<<10)+512-a.getInt32(0xe0,true))|0);
  a.setUint32(0xe8,heading+Math.trunc(((aim-heading)<<2)/5),true);call(0x4672d0,[id,42,20]);luckAdjusted=true;
 }
 return {state,calls,randomDraws,luckAdjusted,next:'0x42c9ea'};
}
