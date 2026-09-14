import {originalRandom} from './original-rng.js';
// 0x42ad32/0x42ad3b–0x42adac: congestion delay and unhappy-departure gate.
export function originalWalkingCongestion(snapshot){
 const state=structuredClone(snapshot),id=state.actorId,b=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original congestion actor unavailable.');
 if(!['0x42ad32','0x42ad3b'].includes(state.congestionEntry))throw Error('Original congestion entry unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(state.congestionEntry==='0x42ad32')a.setUint32(0x18,a.getUint32(0x18,true)|0x1000,true);
 const rng=originalRandom(state.seed);a.setInt16(0xa6,-32-rng.next(64),true);
 if(state.difficulty===0){a.setInt16(0xa6,-100-rng.next(28),true);a.setUint32(0x18,a.getUint32(0x18,true)|0x4000,true);}
 state.seed=rng.state;a.setUint8(0x25,11);
 return {state,randomDraws:rng.draws,next:a.getInt16(0xac,true)<0&&(a.getUint8(0x20)&224)!==32?'0x42adac':'0x42af66'};
}
