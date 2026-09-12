// Native 0x427fb0–0x4280e3. Raw record names are retained where semantics
// are not established; arithmetic follows signed x86 products and truncation.
export function originalBetweenHoleState(snapshot){
 const state=structuredClone(snapshot),b=state.actors?.[state.actorId];
 if(!Number.isInteger(state.actorId)||state.actorId<0||state.actorId>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original between-hole actor unavailable.');
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),hole=a.getInt8(0x29);
 if(hole<0||hole>19)throw Error('Original between-hole index unavailable.');
 const signed=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
 if(!signed(state.difficulty))throw Error('Original between-hole difficulty unavailable.');
 a.setInt16(0xbc,Math.trunc(a.getInt16(0xbc,true)*7/8)+a.getInt16(0xac,true),true);
 if(a.getUint32(0x18,true)&0x100000)a.setUint8(0x3f+hole,a.getUint8(0xbc));
 else a.setInt16(0xbc,a.getInt16(0xac,true),true);
 a.setUint8(0x64+hole,a.getUint8(0xac));
 a.setInt8(0x3e,a.getInt8(0x3e)-Math.sign(a.getInt8(0x3e)));
 const value=a.getInt16(0xac,true);let adjustment;
 if((a.getUint8(0x20)&0xe0)===0x40){
  adjustment=Math.trunc(Math.imul(Math.imul(hole+6,value),state.difficulty)/160);
 }else{
  const r=state.completionRecords?.[a.getInt16(0xbe,true)];
  if(!(r instanceof Uint8Array)||r.length!==44)throw Error('Original between-hole completion record unavailable.');
  if(!signed(state.adjustmentSetting))throw Error('Original between-hole adjustment setting unavailable.');
  const rv=new DataView(r.buffer,r.byteOffset,r.byteLength);
  const factor=(rv.getInt16(40,true)+hole+6)|0;
  const numerator=Math.imul(Math.imul(factor,(value+state.difficulty-1)|0),(state.difficulty+1)|0);
  const denominator=(((state.adjustmentSetting+Math.imul(state.adjustmentSetting,4)+15)|0)<<3);
  if(denominator===0||(numerator===-2147483648&&denominator===-1))throw Error('Original between-hole division fault.');
  adjustment=Math.trunc(numerator/denominator);
 }
 a.setInt16(0xac,value-adjustment,true);
 return {state,next:'return'};
}
