// Native 0x426b00–0x426c92. Score history and settlement-value preparation;
// the following result presentation and next-hole transition remain separate.
export function originalHoleSettlement(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function view(bytes,size,name){if(!(bytes instanceof Uint8Array)||bytes.length!==size)throw Error(`Original settlement ${name} is unavailable.`);return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);}
 function actor(){if(!Number.isInteger(id)||id<0||id>=152)throw Error('Invalid original settlement actor.');return view(state.actors?.[id],256,'actor');}
 function hole(n){return view(state.holeRecords?.[n],520,'hole');}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original settlement effect requires an explicit resolver.');const e={address,args};calls.push(e);const reply=resolve(structuredClone(e),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original settlement state.');state=structuredClone(reply.state);}
 let a=actor();
 if(a.getUint8(0x20)===0){
  const variant=(~a.getUint8(0x21))&7;
  call(0x405e80,[a.getInt8(0x29),variant]);a=actor();
  const strokes=Math.max(0,Math.min(9,a.getInt8(0x2a))),bin=(a.getUint8(0x21)&15)*11+strokes,h=hole(a.getInt8(0x29));
  h.setUint16(0x28+bin*2,h.getUint16(0x28+bin*2,true)+1,true);
  call(0x405e80,[a.getInt8(0x29),variant]);a=actor();
  const statIndex=a.getInt8(0xc2)+(a.getUint8(0x21)&7)*4,s=view(state.statRecords?.[statIndex],184,'statistics'),number=a.getInt8(0x29),total=0x20+number*4,count=0x6c+number*4;
  if(total<0||count<0||total+4>184||count+4>184)throw Error('Original settlement hole index is unavailable.');
  s.setInt32(total,(s.getInt32(total,true)+a.getInt8(0x2a))|0,true);s.setUint32(count,s.getUint32(count,true)+1,true);
 }
 a=actor();const number=a.getInt8(0x29),card=0x2b+number;
 if(card<0||card>=256)throw Error('Original scorecard position is unavailable.');
 a.setUint8(card,a.getUint8(0x2a));
 if(![state.settlementMode,state.settlementBonus].every(Number.isInteger))throw Error('Original settlement modifiers are unavailable.');
 let value=a.getInt16(0xac,true);if(state.settlementMode===2)value=(value*2)|0;
 const flags=hole(number).getUint32(0x200,true);if(flags&1)value=(value+2)|0;if(flags&2)value=(value+2)|0;
 value=(value+state.settlementBonus)|0;state.settlementValue=value;
 const record=view(state.completionRecords?.[a.getInt16(0xbe,true)],44,'completion record'),kind=record.getUint8(2)&7;
 if(kind>3){state.settlementValue=(value+(kind===4?2:5))|0;call(0x40c1f0,[25,a.getInt32(8,true),a.getInt32(12,true),0]);}
 return {state,calls,next:'0x426c92'};
}
