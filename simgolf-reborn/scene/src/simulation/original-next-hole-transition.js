import {originalNextHoleEntry} from './original-next-hole-entry.js';
import {originalBetweenHoleState} from './original-between-hole-state.js';

// Compose the recovered path from 0x427e25. Special last-hole dialogue
// branches stop explicitly until their original text/presentation is supplied.
export function originalNextHoleTransition(snapshot,resolve){
 const entered=originalNextHoleEntry(snapshot,resolve);let {state}=entered;const calls=[...entered.calls];
 if(entered.next==='0x4280e4'){
  if(typeof resolve!=='function')throw Error('Original round exit requires a resolver.');
  const e={address:0x425b50,args:[state.actorId]};calls.push(e);
  const reply=resolve(structuredClone(e),structuredClone(state));
  if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original round-exit state.');
  return {state:structuredClone(reply.state),calls,next:'return'};
 }
 const b=state.actors?.[state.actorId];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original next-hole actor unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),nextHole=a.getInt8(0x29)+1;
 const h=state.holeRecords?.[nextHole];if(!(h instanceof Uint8Array)||h.length!==520)throw Error('Original following-hole record unavailable.');
 const type=a.getUint8(0x20)&0xe0;
 if(!h[0]&&(type===0x40||type===0x60))return {state,calls,next:type===0x40?'0x427f01':'0x427efa'};
 return {...originalBetweenHoleState(state),calls};
}
