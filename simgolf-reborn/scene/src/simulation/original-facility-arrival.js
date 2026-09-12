import {originalRandom} from './original-rng.js';
// 0x42a200–0x42a52b: facility arrivals, ordered reactions and service income.
export function originalFacilityArrival(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,index=state.serviceIndex,calls=[];let randomDraws=0;
 function actor(){const b=state.actors?.[id];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original service actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function facility(){const b=state.facilityRecords;if(!Number.isInteger(index)||index<0||index>=256||!(b instanceof Uint8Array)||b.length!==4096)throw Error('Original service facility unavailable.');return new DataView(b.buffer,b.byteOffset+index*16,16);}
 function effect(address,args){const event={address,args};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous service effect.');state=structuredClone(r.state);}
 function random(n){const r=originalRandom(state.seed),v=r.next(n);state.seed=r.state;randomDraws++;return v;}
 function remark(kind){effect(0x4672d0,[id,kind,20]);}
 function income(amount){state.cashUnits=(state.cashUnits+amount)|0;const a=actor();effect(0x40c580,[amount,a.getInt32(8,true),a.getInt32(12,true),-1]);const ledger=state.serviceIncome,period=state.ledgerPeriod;if(!(ledger instanceof Int16Array)||!Number.isInteger(period)||period<0||period>=ledger.length)throw Error('Original service ledger unavailable.');ledger[period]+=amount;}
 if(facility().getInt16(0,true)===7){
  remark(18);let a=actor();a.setInt16(0xb0,0,true);a.setInt16(0xae,0,true);a.setInt16(0xa6,-48,true);a.setUint8(0x25,11);
  effect(0x40c1f0,[41,a.getInt32(8,true),a.getInt32(12,true),0]);income(5);
 }
 if(facility().getInt16(0,true)===3){
  const delay=-12-random(8);let a=actor();a.setInt16(0xa6,delay,true);a.setUint8(0x25,19);a.setUint32(0x18,a.getUint32(0x18,true)|0x4000000,true);remark(41);
  const f=facility(),i=f.getInt16(2,true)*50+f.getInt16(4,true);if(i<0||i>=2500||!(state.tileFlags instanceof Uint16Array)||!(state.tileServiceState instanceof Uint8Array))throw Error('Original service tile unavailable.');
  a=actor();a.setUint8(0x8c,a.getUint8(0x8c)+3);state.tileFlags[i]|=0x4000;state.tileServiceState[i]=0;
 }
 if(facility().getInt16(0,true)===6){
  const delay=-16-random(9),a=actor();a.setInt16(0xa6,delay,true);a.setUint8(0x24,13);a.setUint8(0x25,0);a.setUint32(0x18,a.getUint32(0x18,true)|16,true);income(state.type6Level>1?8:4);remark(53);
 }
 if(facility().getInt16(0,true)===8){
  const delay=-16-random(9),a=actor();a.setInt16(0xa6,delay,true);a.setUint32(0x18,a.getUint32(0x18,true)|8,true);remark(52);income(state.type8Level>1?10:6);
 }
 if(facility().getInt16(0,true)===10){
  const delay=-16-random(9),a=actor();a.setInt16(0xa6,delay,true);a.setUint32(0x18,a.getUint32(0x18,true)|4,true);remark(51);income(state.type10Level>1?12:8);
 }
 return {state,calls,randomDraws,next:'skip'};
}
