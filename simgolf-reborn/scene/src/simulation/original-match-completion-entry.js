// 0x426f3b–0x426ff6. Matched pairs wait until the partner has advanced
// (signed hole comparison) or finished at hole zero before aggregating scores.
export function originalMatchCompletionEntry(snapshot){
 const state=structuredClone(snapshot),id=state.actorId;
 function actor(i){const b=state.actors?.[i];if(!Number.isInteger(i)||i<0||i>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original match actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const a=actor(id);if(!(a.getUint8(0x21)&0xf0))return {state,next:'0x427a53'};
 const partnerId=a.getInt16(0xaa,true),p=actor(partnerId),hole=a.getInt8(0x29),partnerHole=p.getInt8(0x29);
 if(!(p.getUint8(0x21)&0xf0)||(partnerHole<=hole&&partnerHole!==0))return {state,next:'0x427a53'};
 if(hole<0||hole>18)throw Error('Original match score range unavailable.');
 const totals={actorStrokes:0,partnerStrokes:0,par:0};
 for(let h=1;h<=hole;h++){
  const b=state.holeRecords?.[h];if(!(b instanceof Uint8Array)||b.length!==520)throw Error('Original match hole unavailable.');
  totals.actorStrokes+=a.getInt8(0x2b+h);totals.partnerStrokes+=p.getInt8(0x2b+h);totals.par+=new DataView(b.buffer,b.byteOffset,b.byteLength).getInt8(0);
 }
 return {state,totals,partnerId,hole,pairId:id&0xfffe,next:'0x426ff6'};
}
