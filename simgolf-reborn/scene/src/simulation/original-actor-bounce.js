// 0x42c527–0x42c648. Coefficient is captured before audio, vertical speed
// is reread afterward. The later terrain-impact response is a separate phase.
export function originalActorBounce(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original bouncing actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original bounce effect requires a resolver.');const e={address,args};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original bounce state.');state=structuredClone(r.state);}
 let a=actor();if(a.getInt32(0xe4,true)>0||a.getInt32(0xf0,true)>=0)return {state,calls,landed:false,next:'0x42ca6c'};
 let coefficient=state.bounceCoefficient;if(!Number.isInteger(coefficient)||coefficient< -128||coefficient>127)throw Error('Invalid original bounce coefficient.');
 if(coefficient<2&&snapshot.boundaryFlags!==0)coefficient=2;
 if(a.getInt32(0xf0,true)<-256)call(0x40c1f0,[snapshot.ballTerrain===7?55:54,a.getInt32(0xdc,true),a.getInt32(0xe0,true),0]);
 a=actor();const rebound=Math.max(0,Math.min(9999,(-64-Math.trunc(Math.imul(coefficient,a.getInt32(0xf0,true))/12))|0));
 a.setInt32(0xf0,rebound<128?0:rebound,true);a.setInt32(0xe4,0,true);
 // The native tricky-green branch tests rebound < -192; clamp above makes it unreachable.
 if(snapshot.visualSlot!==-1){if(!Number.isInteger(snapshot.visualSlot)||snapshot.visualSlot<0||snapshot.visualSlot>15)throw Error('Invalid original visual slot.');call(0x4096e0,[snapshot.visualSlot]);}
 return {state,calls,landed:true,next:'0x42c648'};
}
