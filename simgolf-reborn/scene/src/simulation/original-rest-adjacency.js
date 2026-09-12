import {originalTerrainByte} from './original-terrain-byte.js';
const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
// 0x4071d0: raw neighboring map reads precede the final coordinate bounds check.
export function originalRestAdjacency(state,x,z,direction){
 if(!Number.isInteger(direction)||direction<0||direction>7)throw Error('Original rest direction unavailable.');
 const classify=code=>{const v=state.metadata?.[code]?.shotClass;if(!Number.isInteger(v))throw Error('Original rest terrain metadata unavailable.');return (v<<24)>>24;};
 const code=originalTerrainByte(state,x,z);
 if(classify(code)<=0||code===22||code===21)return 0;
 const nx=x+DX[direction],nz=z+DZ[direction],index=nx*50+nz;
 let flags;
 if(index>=0&&index<2500){if(!(state.tileFlags instanceof Uint16Array)||state.tileFlags.length!==2500)throw Error('Original rest flags unavailable.');flags=state.tileFlags[index];}
 else {const bytes=index<0?state.tileFlagsPrefix:state.tileFlagsSuffix,offset=index<0?(bytes?.length??0)+index:index-2500;if(!(bytes instanceof Uint16Array)||offset<0||offset>=bytes.length)throw Error('Original adjacent flag memory unavailable.');flags=bytes[offset];}
 if(flags&0x120)return 0;
 const next=originalTerrainByte(state,nx,nz);
 if(classify(next)<=0||nx<0||nx>=50||nz<0||nz>=50||next===20)return 0;
 return 1;
}
