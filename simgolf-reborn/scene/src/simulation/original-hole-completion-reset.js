// Original post-remark completion stage, 0x426e88–0x426f30.
// Call only after the preceding kind-19 remark has resolved.
export function originalHoleCompletionReset(q){
 const state=structuredClone(q.state),actor=state.actors?.[q.actorId];
 if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original completion actor is unavailable.');
 if(!Number.isInteger(q.clock)||q.clock!==(q.clock|0))throw Error('Original completion clock is unavailable.');
 const a=new DataView(actor.buffer,actor.byteOffset,actor.byteLength),profile=a.getInt16(0xb6,true),holeIndex=(actor[0x21]<<24)>>24;
 const profileRecord=state.completionProfiles?.[profile],markers=state.completionMarkers;
 if(!(profileRecord instanceof Uint8Array)||profileRecord.length!==44||holeIndex+20<0||holeIndex+20>=44)throw Error('Original completion profile score slot is unavailable.');
 if(!(markers instanceof Uint8Array)||markers.length!==64*76)throw Error('Original completion markers are unavailable.');
 profileRecord[holeIndex+20]=actor[0x22];
 for(let i=0;i<markers.length;i+=76)if(markers[i]&&((markers[i+1]<<24)>>24)===q.actorId)markers[i]|=2;
 a.setInt32(0xd4,0,true);actor[0x22]=0;
 const previous=a.getInt32(0xc0,true);
 if(q.clock>previous){
  const hole=state.holeRecords?.[holeIndex];if(!(hole instanceof Uint8Array)||hole.length!==520)throw Error('Original completion timing record is unavailable.');
  const h=new DataView(hole.buffer,hole.byteOffset,hole.byteLength);
  h.setInt32(0x1f4,(h.getInt32(0x1f4,true)+Math.trunc(((q.clock-previous)|0)/2))|0,true);
 }
 a.setInt32(0xc0,q.clock,true);a.setUint32(0x10,a.getUint32(0x10,true)&0xfbdfbbff,true);actor[0x1c]=0;
 return {state};
}
