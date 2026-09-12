const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
// 0x429e24–0x429f27: two cumulative half-tile partner spacing adjustments.
export function originalWalkingPartnerSpacing(snapshot){
 const state=structuredClone(snapshot),id=state.actorId;
 function actor(index){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original spacing actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const a=actor(id),partnerId=a.getInt16(0xaa,true),p=actor(partnerId);
 if(!state.destination||![state.destination.x,state.destination.z].every(Number.isInteger))throw Error('Original spacing destination unavailable.');
 let {x,z}=state.destination,movementReady=state.movementReady|0;
 function offset(previous){
  const hole=state.holes?.[a.getInt8(0x29)];if(!(hole instanceof Uint8Array)||hole.length!==520)throw Error('Original spacing hole unavailable.');
  const direction=(hole[1]-(previous?1:0))&7;
  x=(x-DX[direction]*512)|0;z=(z-DZ[direction]*512)|0;movementReady=0;
  a.setUint32(0x18,a.getUint32(0x18,true)|0x800,true);
 }
 const partnerHole=p.getInt8(0x29),ownHole=a.getInt8(0x29);
 if(partnerHole!==0&&partnerHole<=ownHole&&id<partnerId&&(!(p.getUint32(0x18,true)&0x400)||partnerHole<ownHole||p.getUint8(0x25)===12))offset(true);
 if(partnerHole!==0&&state.walkingOverride)offset(false);
 return {state,destination:{x,z},movementReady,next:'0x429f27'};
}
