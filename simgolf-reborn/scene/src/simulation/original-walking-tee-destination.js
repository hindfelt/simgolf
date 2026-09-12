import {originalHeading} from './original-heading.js';
const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
// 0x4297c7–0x429947: tee stance, queue spacing and initial service threshold.
export function originalWalkingTeeDestination(snapshot){
 const state=structuredClone(snapshot),id=state.actorId,b=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original tee actor unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),hole=state.holes?.[a.getInt8(0x29)];
 if(!(hole instanceof Uint8Array)||hole.length!==520)throw Error('Original tee hole unavailable.');
 const h=new DataView(hole.buffer,hole.byteOffset,hole.byteLength);
 const offset=a.getUint8(0x21)<=4&&a.getUint8(0x21)!==3&&a.getUint8(0x20)===0?0x10:8;
 const teePosition={x:((h.getInt32(offset,true)<<10)+512)|0,z:((h.getInt32(offset+4,true)<<10)+512)|0};
 const heading=originalHeading(((h.getInt32(0x18,true)<<10)+512-teePosition.x)|0,((h.getInt32(0x1c,true)<<10)+512-teePosition.z)|0);
 const facing=(((heading>>28)+1)>>1)&7,stance=(facing&1?3:5)<<6;
 let x=(teePosition.x-Math.imul(DX[facing],stance))|0,z=(teePosition.z-Math.imul(DZ[facing],stance))|0;
 const waiting=state.waitingGroups|0;
 if(waiting){const side=(hole[1]+(id&1))&7;x=(x-(DX[side]<<10))|0;z=(z-(DZ[side]<<10))|0;}
 const flags=a.getUint32(0x18,true),queuePressure=(waiting+waiting)|0;
 const firstThreshold=((flags&0x2000?4:8)-queuePressure)|0;
 const first=a.getInt16(0xae,true),second=a.getInt16(0xb0,true);
 const secondThreshold=((((~flags&0x1000000)|0x2000000)>>>22)-queuePressure)|0;
 const seekService=(first>=firstThreshold&&first>1)||(second>=secondThreshold&&second>2);
 return {state,teePosition,destination:{x,z},next:seekService?'0x429947':'0x429a84'};
}
