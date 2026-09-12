const recordView=r=>new DataView(r.buffer,r.byteOffset,r.byteLength);
// Original 0x40c580: an eight-slot floating money notice, not the cash ledger.
export function originalMoneyNotice(q){
 const state=structuredClone(q.state),units=q.units|0;
 if(!units||(q.globalFlags&0x1000000))return {state};
 if((q.holeIndex|0)!==-1){
  const hole=state.holeRecords?.[q.holeIndex];if(!(hole instanceof Uint8Array)||hole.length!==520)throw Error('Original money notice hole is unavailable.');
  const h=recordView(hole);h.setInt32(0x1f8,(h.getInt32(0x1f8,true)-units)|0,true);
 }
 const index=state.moneyNoticeIndex;
 if(!Number.isInteger(index)||index<0||index>7||!Array.isArray(state.moneyNotices)||state.moneyNotices.length!==8)throw Error('Original money notice queue is unavailable.');
 state.moneyNotices[index]={x:q.x|0,z:q.z|0,units,ticks:24};state.moneyNoticeIndex=(index+1)%8;
 return {state};
}
// Original 0x426e12–0x426e6b: called after fee eligibility/presentation gates.
// Monetary counters are units (displayed at $100/unit), with native wrapping.
export function originalFeePosting(q){
 const state=structuredClone(q.state),actor=state.actors?.[q.actorId];
 if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original fee actor is unavailable.');
 for(const key of ['feeUnits','totalFeeUnits','feeLedgerIndex'])if(!Number.isInteger(state[key]))throw Error('Original fee posting globals are unavailable.');
 const index=(actor[0x21]<<24)>>24,hole=state.holeRecords?.[index],ledger=state.feeLedgerIndex;
 if(!(hole instanceof Uint8Array)||hole.length!==520||!Number.isInteger(state.feeLedger?.[ledger]))throw Error('Original fee posting records are unavailable.');
 const h=recordView(hole),a=recordView(actor),units=state.feeUnits|0;
 state.totalFeeUnits=(state.totalFeeUnits+units)|0;h.setInt32(0x1fc,(h.getInt32(0x1fc,true)+units)|0,true);
 state.feeLedger[ledger]=((state.feeLedger[ledger]+units)<<16)>>16;
 const event={address:0x40c580,args:[units,a.getInt32(0,true),a.getInt32(4,true),-1]};
 const result=originalMoneyNotice({state,globalFlags:q.globalFlags,units,x:event.args[1],z:event.args[2],holeIndex:-1});
 return {...result,events:[event]};
}
