// 0x427a53–0x427bd4: round totals and ten-slot original score list.
// Later record announcement/rewards and next-hole entry remain separate.
export function originalRoundScoreList(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function view(b,n){if(!(b instanceof Uint8Array)||b.length!==n)throw Error('Original round-score record unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 if(!Number.isInteger(id)||id<0||id>=152)throw Error('Original round-score actor unavailable.');
 const a=view(state.actors?.[id],256),hole=a.getInt8(0x29);
 if(hole<0||hole>18)throw Error('Original round-score hole unavailable.');
 if(!Number.isInteger(state.globalFlags)||state.globalFlags<0||state.globalFlags>0xffffffff)throw Error('Original round-score flags unavailable.');
 if(state.globalFlags&0x200000)return {state,calls,next:'0x427e25'};
 if(hole!==18&&view(state.holeRecords?.[hole+1],520).getUint8(0)!==0)return {state,calls,next:'0x427e25'};
 const totals={playedStrokes:0,playedPar:0,projectedStrokes:0,projectedRelative:0,completionBits:0};
 for(let h=1;h<=18;h++){
  if(h<=hole){
   const strokes=a.getInt8(0x2b+h),par=view(state.holeRecords?.[h],520).getInt8(0);
   totals.playedStrokes+=strokes;totals.playedPar+=par;totals.projectedStrokes+=strokes;totals.projectedRelative+=strokes-par;
   totals.completionBits+=view(state.completionRecords?.[a.getInt16(0xbe,true)],44).getUint8(3+h)&3;
  }else{totals.projectedStrokes+=5;totals.projectedRelative++;}
 }
 function list(){if(!(state.scoreList instanceof Int32Array)||state.scoreList.length!==10)throw Error('Original ten-slot score list unavailable.');return state.scoreList;}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original score-list presentation requires a resolver.');const e={address,args};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original score-list state.');state=structuredClone(r.state);}
 state.sourceText='';let rank=0;
 for(;rank<10;rank++){
  const old=list()[rank];
  if(old===0||totals.playedStrokes<old){
   if(old!==0)for(let source=8;source>=rank;source--){
    const value=list()[source];if(value!==0){list()[source+1]=value;state.sourceText='';call(0x45b2c0,[source+20]);call(0x45b180,[source+21]);}
   }
   list()[rank]=totals.playedStrokes;state.sourceText='';call(0x466fb0,[id,0]);call(0x45b180,[rank+20]);break;
  }
 }
 return {state,calls,totals,rank:rank<10?rank:null,next:'0x427bd4'};
}
