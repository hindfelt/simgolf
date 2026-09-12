// Native 0x426e6b–0x426f3b, after result presentation/settlement-value use.
// Completion records start at 0x583432 (44-byte stride); notices at 0x5842b2.
export function originalHoleCompletionState(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function view(bytes,size,name){if(!(bytes instanceof Uint8Array)||bytes.length!==size)throw Error(`Original completion ${name} is unavailable.`);return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);}
 function actor(){if(!Number.isInteger(id)||id<0||id>=152)throw Error('Invalid original completion actor.');return view(state.actors?.[id],256,'actor');}
 let a=actor();
 if(a.getUint8(0x8c)===0){
  if(typeof resolve!=='function')throw Error('Original completion reaction requires an explicit resolver.');
  const e={address:0x4672d0,args:[id,19,a.getInt16(0xac,true)]};calls.push(e);const reply=resolve(structuredClone(e),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original completion state.');state=structuredClone(reply.state);a=actor();
 }
 const record=view(state.completionRecords?.[a.getInt16(0xbe,true)],44,'score record'),scoreOffset=0x14+a.getInt8(0x29);
 if(scoreOffset<0||scoreOffset>=44)throw Error('Original completion score position is unavailable.');
 record.setUint8(scoreOffset,a.getUint8(0x2a));
 if(!Array.isArray(state.completionNotices)||state.completionNotices.length!==64)throw Error('Original completion notices are unavailable.');
 for(const bytes of state.completionNotices){const n=view(bytes,76,'notice');if(n.getUint8(0)!==0&&n.getInt8(1)===id)n.setUint8(0,n.getUint8(0)|2);}
 if(![state.phaseCounter,state.globalFlags].every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff))throw Error('Original completion clock/flags are unavailable.');
 a.setInt32(0xdc,0,true);a.setUint8(0x2a,0);
 const phase=state.phaseCounter|0,previous=a.getInt32(0xc8,true);
 if(phase>previous){const h=view(state.holeRecords?.[a.getInt8(0x29)],520,'hole');h.setInt32(0x1ec,(h.getInt32(0x1ec,true)+Math.trunc(((phase-previous)|0)/2))|0,true);}
 a.setInt32(0xc8,phase,true);a.setUint32(0x18,a.getUint32(0x18,true)&0xfbdfbbff,true);a.setUint8(0x24,0);
 return {state,calls,next:state.globalFlags&0x200000?'0x427e25':'0x426f3b'};
}
