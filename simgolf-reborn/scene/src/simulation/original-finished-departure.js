// 0x429024–0x4290ca plus the actual 0x425b10 assignment cleanup.
export function originalFinishedDeparture(snapshot){
 const state=structuredClone(snapshot),calls=[],id=state.actorId;
 function actor(index){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original finished actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const a=actor(id),tile=state.actorTile,club=state.clubhouseTile;
 if(a.getUint8(0x29)!==19)return {state,calls,next:'0x4290ca'};
 if(!tile||!club||![tile.x,tile.z,club.x,club.z].every(Number.isInteger))throw Error('Original departure tiles unavailable.');
 const atClub=tile.x===club.x&&tile.z===club.z;
 if(!atClub&&!(a.getUint32(0x18,true)&512)&&a.getInt32(0x10,true)!==-1)return {state,calls,next:'0x4290ca'};
 a.setUint8(0x8c,0);a.setUint8(0x29,0);
 const partner=actor(a.getInt16(0xaa,true));
 if((a.getUint32(0x18,true)|partner.getUint32(0x18,true))&512){
  if(partner.getUint8(0x29)!==0&&partner.getUint8(0x29)!==19)return {state,calls,next:'skip'};
  if(state.selectionState===id)state.selectionState=-1;
 }
 const assignments=state.visitorAssignments;if(!(assignments instanceof Uint8Array)||assignments.length!==800)throw Error('Original visitor assignment table unavailable.');
 a.setUint8(0x2a,0);a.setUint8(0x25,0);a.setUint8(0x29,0);
 const table=new DataView(assignments.buffer,assignments.byteOffset,assignments.byteLength),record=a.getUint16(0xbe,true);
 for(let i=0;i<100;i++)if(table.getUint16(i*8+4,true)===record)table.setUint16(i*8,65535,true);
 calls.push({address:0x425b10,args:[id]});return {state,calls,next:'skip'};
}
