import {originalResolvedCupCompletion} from './original-resolved-cup-completion.js';

// Consume only a captured ground-motion result. Its terminal snapped ball is
// not the input to native cup effects: those start with cupEntry.ball instead.
export function originalMotionCupHandoff(snapshot,motion,resolve,resolveSpecial){
 if(motion?.captured!==true||!motion.cupEntry?.ball)throw Error('Original captured motion entry required.');
 const state=structuredClone(snapshot),id=state.actorId,b=state.actors?.[id],entry=motion.cupEntry;
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original captured actor unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),ball=entry.ball;
 for(const [name,offset] of [['x',0xdc],['z',0xe0],['height',0xe4],['speed',0xec],['verticalSpeed',0xf0],['angularOffset',0xf4]]){
  if(!Number.isInteger(ball[name])||ball[name]<-2147483648||ball[name]>2147483647)throw Error(`Original captured ${name} unavailable.`);
  a.setInt32(offset,ball[name],true);
 }
 for(const n of [ball.heading,motion.rngState])if(!Number.isInteger(n)||n<0||n>0xffffffff)throw Error('Original captured heading/random state unavailable.');
 a.setUint32(0xe8,ball.heading,true);state.seed=motion.rngState;state.ballTile=structuredClone(entry.ballTile);
 // Keep actor flags until native completion clears them after scoring.
 return originalResolvedCupCompletion(state,resolve,resolveSpecial);
}
