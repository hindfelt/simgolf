import {originalTerrainByte} from './original-terrain-byte.js';
// Capture pre-movement locals from the same actor/map revision. Coefficients
// use original metadata bytes; no conversion from browser tile dimensions.
export function originalActorMotionContext(snapshot){
 const state=structuredClone(snapshot),id=state.actorId,b=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original motion context actor unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),x=a.getInt32(0xdc,true)>>10,z=a.getInt32(0xe0,true)>>10,index=x*50+z;
 if(x<0||z<0||x>=50||z>=50)throw Error('Original motion outside map requires outer actor handling.');
 const code=originalTerrainByte(state,x,z),m=state.metadata?.[code];
 const signedByte=v=>Number.isInteger(v)&&v>=-128&&v<=127;
 if(!m||![m.bounceCoefficient,m.rollCoefficient,m.scatterCoefficient].every(signedByte))throw Error('Original motion terrain coefficients unavailable.');
 if(!(state.tileFlags instanceof Uint16Array)||state.tileFlags.length!==2500||!(state.edgeMasks instanceof Uint8Array)||state.edgeMasks.length!==2500)throw Error('Original motion map flags unavailable.');
 return Object.assign(state,{ballTile:{x,z},ballTerrain:code,terrainFlags:state.tileFlags[index],edgeFlags:state.edgeMasks[index],bounceCoefficient:m.bounceCoefficient,rollCoefficient:m.rollCoefficient,scatterCoefficient:m.scatterCoefficient,centreFlag:0});
}
