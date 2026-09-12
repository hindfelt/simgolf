// 0x4029f3–0x402b6b: one visual-slot entry before its movement body.
export function originalVisualSlotEntry(snapshot,slot,resolve){
 let state=structuredClone(snapshot);const calls=[];
 if(!Number.isInteger(slot)||slot<0||slot>=64||!Number.isInteger(state.selectedActor)||!Number.isInteger(state.phaseCounter))throw Error('Original visual slot context unavailable.');
 function view(bytes,size){if(!(bytes instanceof Uint8Array)||bytes.length!==size)throw Error('Original visual slot record unavailable.');return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);}
 const record=()=>view(state.visualRecords?.[slot],76),actor=id=>view(state.actors?.[id],256);
 const actorId=()=>record().getInt16(0x20,true);
 function call(address,args){
  if(typeof resolve!=='function')throw Error('Original visual effect resolver unavailable.');const event={address,args};calls.push(event);
  const reply=resolve(structuredClone(event),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous visual effect state.');state=structuredClone(reply.state);return reply.value;
 }
 if(record().getInt8(0x13)>=0&&state.selectedActor===-1)record().setUint8(0x12,0);
 if(record().getUint8(0x12)===0)return {state,calls,next:'skip'};
 if(record().getUint8(0x15)!==0&&(state.phaseCounter&3)===0){
  record().setUint8(0x15,record().getUint8(0x15)-1);
  if(record().getUint8(0x15)===4&&record().getUint8(0x14)===254){
   let kind=34;
   if(!(record().getUint8(0x12)&8)){const a=actor(actorId());if(a.getInt16(0xb0,true)>16||a.getInt16(0xae,true)>16||a.getInt16(0xb2,true)>160)kind=58;}
   const value=call(0x466ea0,[actorId()]);if(!Number.isInteger(value))throw Error('Original visual reaction value unavailable.');call(0x4672d0,[actorId(),kind,value]);
  }
  if(record().getUint8(0x15)===4&&record().getUint8(0x14)===251){
   if(record().getUint8(0x12)&8)actor(actorId()).setInt16(0xb0,99,true);
   call(0x4672d0,[actorId(),25,20]);
   if(!Number.isInteger(state.cashTotal))throw Error('Original visual payment balance unavailable.');state.cashTotal=(state.cashTotal+2)|0;
   const x=record().getInt32(0,true),z=record().getInt32(4,true);actor(actorId()).setInt16(0xb0,0,true);call(0x40c580,[2,x,z,-1]);
   const p=view(state.financialPeriods?.[state.periodIndex],20);p.setUint16(4,p.getUint16(4,true)+2,true);
  }
 }
 const delay=record().getUint16(0x1a,true);
 if(delay!==0){record().setUint16(0x1a,delay-1,true);return {state,calls,next:'skip'};}
 return {state,calls,next:'0x402b6b'};
}
