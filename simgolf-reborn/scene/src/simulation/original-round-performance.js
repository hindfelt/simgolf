// 0x427d38–0x427e25. Completion record base is 0x583430, stride 44.
export function originalRoundPerformance(snapshot){
 const state=structuredClone(snapshot),id=state.actorId,b=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original performance actor unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),r=state.completionRecords?.[a.getInt16(0xbe,true)];
 if(!(r instanceof Uint8Array)||r.length!==44)throw Error('Original performance record unavailable.');
 const record=new DataView(r.buffer,r.byteOffset,r.byteLength),signed=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
 const totals=state.totals;
 if(!totals||![totals.completionBits,totals.projectedStrokes,totals.projectedRelative,state.difficulty,state.performanceBonus].every(signed))throw Error('Original performance totals unavailable.');
 let points=totals.completionBits;
 if(a.getInt16(0xac,true)>=((Math.imul(state.difficulty,2)+6)|0))points=(points+1)|0;
 const best=record.getUint8(0);
 if(totals.projectedStrokes<best||best===0)record.setUint8(0,totals.projectedStrokes);
 const prior=record.getInt8(1);
 record.setInt8(1,prior===0?totals.projectedRelative:Math.trunc(((prior+totals.projectedRelative)|0)/2));
 if(!Number.isInteger(state.courseHoleCount)||state.courseHoleCount<0||state.courseHoleCount+2>=44)throw Error('Original performance hole count unavailable.');
 if(![state.periodIndex,state.cashTotal,state.secondaryBalance].every(signed))throw Error('Original performance economy unavailable.');
 if((record.getUint8(2+state.courseHoleCount)&3)||state.difficulty===0||(state.periodIndex&0xffff)===0||(state.cashTotal<200&&state.secondaryBalance<=0))points=(points+1)|0;
 points=(points+state.performanceBonus)|0;
 const tier=record.getUint8(2)&7;
 if(a.getUint8(0x20)===0&&points>=(1<<tier)&&tier<5){a.setUint32(0x18,a.getUint32(0x18,true)|0x80000000,true);a.setInt16(0xa6,-8,true);}
 return {state,performancePoints:points,next:'0x427e25'};
}
