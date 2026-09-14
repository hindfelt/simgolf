import {originalTerrainByte} from './original-terrain-byte.js';
const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
// 0x42b17c–0x42b2b2: rate/distance scaling, position and remaining budget.
export function originalWalkingPositionStep(snapshot){
 const state=structuredClone(snapshot),id=state.actorId,b=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256||![state.walkingRate,state.distance].every(Number.isInteger))throw Error('Original walking step state unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),facing=a.getInt8(0x22);
 if(facing<0||facing>7)throw Error('Original walking facing unavailable.');
 let rate=state.walkingRate|0;
 if(state.worldFlags&0x20000){const high=Number((BigInt(rate)*0x55555555n)>>32n),difference=(high-rate)|0;let adjustment=difference>>1;adjustment=(adjustment+(adjustment>>>31))|0;rate=(rate+adjustment)|0;}
 const cap=Math.trunc(Math.imul(state.distance,7)/128);let clamped=Math.max(rate,0);if(cap>=0&&clamped>cap)clamped=cap;
 const numerator=Math.imul(state.fastWalking?128:64,clamped),denominator=(state.difficulty===0?7:5)+(facing&1?3:0),step=Math.trunc(numerator/denominator)|0;
 const flags=a.getUint32(0x18,true);a.setUint32(0x18,step<30?flags|0x80000:flags&~0x80000,true);
 const x=(a.getInt32(8,true)+Math.imul(DX[facing],step))|0,z=(a.getInt32(12,true)+Math.imul(DZ[facing],step))|0;
 a.setInt32(8,x,true);a.setInt32(12,z,true);a.setInt16(0x1c,a.getInt16(0x1c,true)-step,true);
 const index=state.actorIndex;if(!Number.isInteger(index)||index<0||index>=2500||!(state.terrain instanceof Uint8Array)||state.terrain.length!==2500)throw Error('Original walking terrain unavailable.');
 if(state.terrain[index]!==17){const tx=x>>10,tz=z>>10,terrain=tx<0||tx>=50||tz<0||tz>=50?20:originalTerrainByte(state,tx,tz);if(terrain===17)a.setInt16(0x1c,0,true);}
 return {state,step,next:'0x42b2b2'};
}
