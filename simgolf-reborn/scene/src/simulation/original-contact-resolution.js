import {originalPostContactMotion} from './original-post-contact-motion.js';
import {originalStoppedShot} from './original-stopped-shot.js';
// Recovered contact through stopped-shot accounting. Native holes have one
// backing table; older accounting adapters call it holeRecords.
export function originalContactResolution(snapshot,resolve){
 const initial=structuredClone(snapshot);
 if(initial.holeRecords)initial.holes=initial.holeRecords;
 const motion=originalPostContactMotion(initial,resolve);
 if(!motion.stopped)return {...motion,accounted:false};
 const state=motion.state;
 state.holeRecords=state.holes;
 state.holeTargets=state.holes.map(b=>{if(!b)return null;const h=new DataView(b.buffer,b.byteOffset,b.byteLength);return {x:h.getInt32(0x18,true),z:h.getInt32(0x1c,true)};});
 const stopped=originalStoppedShot(state,resolve);
 stopped.state.holes=stopped.state.holeRecords;
 return {...motion,...stopped,calls:[...motion.calls,...stopped.calls],accounted:true};
}
