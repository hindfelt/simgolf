const kinds=[0,9,9,9,1,2,9,9,3,4,5,6,9,9,9,9,9,7,9,1,9,9,8,9,9,9,1];
const phrases=[' will be looking for a tougher course after ',' thinks your course needs improvement after ',' has punched out another golfer at ',null,null,' is too thirsty to play any more after ',' is too hungry to keep playing after ',' has insulted another golfer at ',' is too tired to continue after ',' is leaving the course in disgust after '];
// 0x428b38–0x428f64: initial complaint, resignation and angry departure state.
export function originalAngryComplaint(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];
 function actor(){const b=state.actors?.[id];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original complaining actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function effect(address,args){const event={address,args};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous complaint effect.');state=structuredClone(r.state);return r.value;}
 function record(){const b=state.completionRecords?.[actor().getInt16(0xbe,true)];if(!(b instanceof Uint8Array)||b.length!==44)throw Error('Original membership record unavailable.');return b;}
 state.sourceText='';effect(0x466fb0,[id,state.entryValue??0]);
 const reason=(actor().getUint8(0x8d)&127)-4,kind=reason>=0&&reason<27?kinds[reason]:9;
 if(kind===3||kind===4){state.sourceText+=kind===3?' has wrapped ':' has thrown ';const male=effect(0x46c140,[id]);state.sourceText+=male?'his':'her';state.sourceText+=kind===3?' club around a tree on ':' clubs into the lake on ';}
 else state.sourceText+=phrases[kind];
 const hole=actor().getInt8(0x29);state.sourceText+=hole<19?'hole '+hole:"today's round";state.sourceText+='!';
 if((record()[2]&7)>1){state.sourceText+=' ';effect(0x466fb0,[id,0]);state.sourceText+=' resigns ';const male=effect(0x46c140,[id]);state.sourceText+=male?'his':'her';state.sourceText+=' membership.';record()[2]=0;}
 const r=record(),currentHole=actor().getInt8(0x29);if(currentHole<0||currentHole>19)throw Error('Original complaint hole unavailable.');state.messageFlag=0;r[3+currentHole]|=4;r[41]=255;
 effect(0x40c7f0,[-2147483648,0,id]);effect(0x447a30,[41,100,0,0,0]);
 const a=actor(),oldHole=a.getInt8(0x29),hb=state.holes?.[oldHole];if(!(hb instanceof Uint8Array)||hb.length!==520)throw Error('Original complaint course unavailable.');const h=new DataView(hb.buffer,hb.byteOffset,hb.byteLength);
 a.setInt16(0xa6,-99,true);a.setUint8(0x25,13);a.setUint8(0x29,19);h.setUint16(0x15a,h.getUint16(0x15a,true)+1,true);a.setUint32(0x18,(a.getUint32(0x18,true)&~0x10000)|0x20000000,true);a.setInt16(0xb2,0,true);a.setUint8(0x3e,253);if(a.getUint32(0x18,true)&512)state.selectionState=-1;
 return {state,calls,next:'0x428f64'};
}
