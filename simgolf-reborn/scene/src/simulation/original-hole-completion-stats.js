// Original 0x426b10–0x426be5. The two 0x405e80 calls are read-only
// comparisons whose return values are discarded by this caller.
export function originalHoleCompletionStats(q){
 const state=structuredClone(q.state),actor=state.actors?.[q.actorId],events=[];
 if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original completion actor is unavailable.');
 const holeIndex=(actor[0x21]<<24)>>24,stroke=(actor[0x22]<<24)>>24;
 if(holeIndex+0x23<0||holeIndex+0x23>=256)throw Error('Original completion score slot is unavailable.');
 if(actor[0x18]===0){
  const hole=state.holeRecords?.[holeIndex];if(!(hole instanceof Uint8Array)||hole.length!==520)throw Error('Original completion hole is unavailable.');
  const category=(~actor[0x19])&7,event={address:0x405e80,args:[holeIndex,category]};events.push(structuredClone(event));
  const h=new DataView(hole.buffer,hole.byteOffset,hole.byteLength),offset=0x30+2*((actor[0x19]&15)*11+Math.min(9,Math.max(0,stroke)));
  h.setUint16(offset,(h.getUint16(offset,true)+1)&65535,true);events.push(event);
  const index=(((actor[0xba]<<24)>>24)+(actor[0x19]&7)*4)*46+holeIndex;
  if(!(state.performance instanceof Int32Array)||index<0||index+19>=state.performance.length)throw Error('Original completion performance counters are unavailable.');
  state.performance[index]=(state.performance[index]+stroke)|0;state.performance[index+19]=(state.performance[index+19]+1)|0;
 }
 actor[holeIndex+0x23]=actor[0x22];
 return {state,events};
}
