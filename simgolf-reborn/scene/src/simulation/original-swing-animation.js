// 0x414f79–0x41503b: animation 16 releases the planned swing into phase 2.
// Direction/frame tables and pre-update frame are supplied by the animation
// caller; this does not infer timing from browser frame rate.
export function originalSwingAnimation(snapshot){
 const state=structuredClone(snapshot),b=state.actor;
 if(!(b instanceof Uint8Array)||b.length!==256||b[0x25]!==16||!Number.isInteger(state.animationDirection)||state.animationDirection<0||state.animationDirection>7||!Number.isInteger(state.previousFrame)||state.previousFrame<0||state.previousFrame>255||!Number.isInteger(state.frameIndex)||!Number.isInteger(state.globalFlags))throw Error('Original swing animation context unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),club=a.getInt8(0x24);
 let animationGroup=club===13?140:club<=6?120:130,frameIndex=state.frameIndex;
 const count=state.frameCounts?.[animationGroup+state.animationDirection];
 if(!Number.isInteger(count)||count<0||count>0x7fffffff)throw Error('Original swing frame count unavailable.');
 if(count){
  b[0x26]=(b[0x26]+1)&255;frameIndex=b[0x26]%count;
  if(frameIndex===count-1)b[0x28]=2;
 }else{animationGroup=10;b[0x28]=2;}
 if(state.globalFlags&4)b[0x26]=state.previousFrame;
 if(b[0x27]!==animationGroup){
  b[0x26]=0;b[0x27]=animationGroup;frameIndex=0;
  a.setUint32(0x18,a.getUint32(0x18,true)&0xf7ffffff,true);
 }
 return {state,animationGroup,frameIndex};
}

// Preserve the rest of the actor world when the renderer updates this pose.
export function originalActorSwingAnimation(snapshot,context){
 if(!Number.isInteger(snapshot.actorId)||snapshot.actorId<0||snapshot.actorId>=152)throw Error('Original animation actor index unavailable.');
 const state=structuredClone(snapshot),actor=state.actors?.[state.actorId];
 const result=originalSwingAnimation({...context,actor,globalFlags:state.globalFlags});
 state.actors[state.actorId]=result.state.actor;
 return {state,animationGroup:result.animationGroup,frameIndex:result.frameIndex};
}
