import {originalBallPositionStep} from './original-ball-position.js';

// 0x42bdc3–0x42beb0: height sample, position, apex visual, gravity,
// periodic visual. Effect mutations are visible to subsequent operations.
export function originalActorPositionStep(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId,visual=state.visualSlot;
 if(!Number.isInteger(visual)||visual< -1||visual>15)throw Error('Original motion visual slot unavailable.');
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original motion actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original motion effect requires a resolver.');const e={address,args};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original motion state.');state=structuredClone(r.state);return r;}
 let a=actor();const sampled=call(0x42f110,[a.getInt32(0xdc,true),a.getInt32(0xe0,true)]);
 if(!Number.isInteger(sampled.value)||sampled.value< -2147483648||sampled.value>2147483647)throw Error('Original prior terrain height unavailable.');
 a=actor();const before={x:a.getInt32(0xdc,true),z:a.getInt32(0xe0,true),height:a.getInt32(0xe4,true),speed:a.getInt32(0xec,true),verticalSpeed:a.getInt32(0xf0,true),heading:a.getUint32(0xe8,true)};
 const moved=originalBallPositionStep(before);a.setInt32(0xdc,moved.x,true);a.setInt32(0xe0,moved.z,true);a.setInt32(0xe4,moved.height,true);
 if(moved.height!==0||a.getInt32(0xf0,true)!==0){
  const vertical=a.getInt32(0xf0,true);
  if(visual!==-1&&vertical>0&&vertical<64)call(0x4096e0,[visual]);
  a=actor();a.setInt32(0xf0,(a.getInt32(0xf0,true)-64)|0,true);
 }
 if(visual!==-1){
  if(!Number.isInteger(state.phaseCounter)||state.phaseCounter<0||state.phaseCounter>0xffffffff)throw Error('Original motion phase unavailable.');
  if((state.phaseCounter&7)===0)call(0x4096e0,[visual]);
 }
 return {state,calls,previousTerrainHeight:sampled.value,stepX:(moved.x-before.x)|0,stepCosine:(before.z-moved.z)|0,next:'0x42beb0'};
}
