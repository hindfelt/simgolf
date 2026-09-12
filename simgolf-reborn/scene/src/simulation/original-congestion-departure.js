// 0x42adac–0x42af66: complaint, departure records and partner cleanup.
export function originalCongestionDeparture(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(i=id){const b=state.actors?.[i];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original departing actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function effect(address,args){const event={address,args};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous departure effect.');state=structuredClone(r.state);}
 state.sourceText='';effect(0x466fb0,[id,0]);state.sourceText+=' and ';effect(0x466fb0,[actor().getInt16(0xaa,true),0]);state.sourceText+=' are leaving the course at hole '+actor().getInt8(0x29)+", 'Arghh, I am so tired of waiting for these idiots!'";state.messageFlag=0;
 effect(0x40c7f0,[-2147483648,0,id]);effect(0x447a30,[41,100,0,0,0]);
 let a=actor(),hole=a.getInt8(0x29),hb=state.holes?.[hole];if(!(hb instanceof Uint8Array)||hb.length!==520)throw Error('Original departure hole unavailable.');
 a.setInt16(0xa6,0,true);const h=new DataView(hb.buffer,hb.byteOffset,hb.byteLength);h.setUint16(0x15a,h.getUint16(0x15a,true)+1,true);
 const index=a.getInt16(0xbe,true),record=state.completionRecords?.[index];if(!(record instanceof Uint8Array)||record.length!==44||hole<0||hole>19)throw Error('Original departure record unavailable.');record[3+hole]|=4;record[0x29]=255;
 actor(a.getInt16(0xaa,true)).setInt32(0xdc,0,true);actor(actor().getInt16(0xaa,true)).setInt32(8,0,true);effect(0x425b50,[actor().getInt16(0xaa,true)]);
 a=actor();a.setUint8(0x29,19);a.setUint32(0x18,(a.getUint32(0x18,true)&~0x10000)|0x20000000,true);a.setInt16(0xb2,0,true);a.setUint8(0x3e,253);
 return {state,calls,next:'skip'};
}
