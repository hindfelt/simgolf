import {originalRandom} from './original-rng.js';
// 0x466a70: signed octant approximation, with strict 2:1 boundaries.
export function originalWalkingOctant(x,z){
 if(![x,z].every(n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647))throw Error('Original walking vector unavailable.');
 const ax=Math.abs(x)|0,az=Math.abs(z)|0;
 let direction=x>0?(z>0?3:1):(z>0?5:7);
 if(ax>((az+az)|0))direction=x>0?2:6;
 if(az>((ax+ax)|0))direction=z>0?4:0;
 return direction;
}
// 0x42a71c–0x42a793: near-target facing and reversal pause.
export function originalWalkingNearSteering(snapshot){
 const state=structuredClone(snapshot),id=state.actorId,b=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256||!Number.isInteger(state.distance))throw Error('Original steering state unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),previousFacing=a.getInt8(0x22);
 if(state.distance>=1024)return {state,previousFacing,randomDraws:0,next:'0x42aa30'};
 if(!state.delta||![state.delta.x,state.delta.z].every(Number.isInteger))throw Error('Original steering delta unavailable.');
 const half=Math.trunc(state.distance/2),facing=originalWalkingOctant((state.delta.x+half)|0,(state.delta.z+half)|0);
 a.setUint8(0x22,facing);a.setInt16(0x1c,0,true);let randomDraws=0;
 if(state.reversalCheck&&facing===(previousFacing^4)){
  const rng=originalRandom(state.seed);a.setInt16(0xa6,-8-rng.next(4),true);state.seed=rng.state;randomDraws=1;a.setUint8(0x25,11);
 }
 return {state,previousFacing,randomDraws,next:'0x42a793'};
}
