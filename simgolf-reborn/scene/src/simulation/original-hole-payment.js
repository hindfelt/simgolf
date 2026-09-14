// 0x426c92–0x426e6b: first-fee tutorial and native payment ledgers.
export function originalHolePayment(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function view(b,size){if(!(b instanceof Uint8Array)||b.length!==size)throw Error('Original hole-payment record unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function actor(){if(!Number.isInteger(id)||id<0||id>=152)throw Error('Original hole-payment actor unavailable.');return view(state.actors?.[id],256);}
 function period(i){return view(state.financialPeriods?.[i],20);}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original hole-payment presentation requires a resolver.');const e={address,args};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original payment state.');state=structuredClone(r.state);}
 const signed=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
 if(!Number.isInteger(state.globalFlags)||state.globalFlags<0||state.globalFlags>0xffffffff)throw Error('Original payment flags unavailable.');
 if(state.globalFlags&0x200000)return {state,calls,next:'0x426e6b'};
 if(!Number.isInteger(state.periodIndex)||state.periodIndex<0||state.periodIndex>32767||!signed(state.settlementValue))throw Error('Original payment period/value unavailable.');
 let value=state.settlementValue;
 if(state.periodIndex===0&&period(0).getUint16(0,true)===0){
  state.recordHolder=id|0x100;state.sourceText='';call(0x466fb0,[id,0]);
  if(typeof state.sourceText!=='string'||!signed(state.settlementValue))throw Error('Original first-fee text unavailable.');
  state.sourceText+=' has just paid you your first greens fee of '+Math.imul(state.settlementValue,100)+' simoleans!  Golfers pay a fee at the end of each hole - '+'happy golfers pay higher fees, unhappy golfers pay less.'+' Greens fees are your main source of revenue, so it pays to keep your golfers happy.'+' Refer to your financial report for more detailed information.';
  state.presentationMode=3;call(0x40c7f0,[1,1,id]);value=state.settlementValue;
 }
 if(!signed(value)||!signed(state.cashTotal))throw Error('Original payment amount unavailable.');
 const a=actor(),h=view(state.holeRecords?.[a.getInt8(0x29)],520);
 state.cashTotal=(state.cashTotal+value)|0;h.setInt32(0x1f4,(h.getInt32(0x1f4,true)+value)|0,true);
 const p=period(state.periodIndex);p.setUint16(0,p.getUint16(0,true)+value,true);
 call(0x40c580,[value,a.getInt32(8,true),a.getInt32(12,true),-1]);
 return {state,calls,next:'0x426e6b'};
}
