import {originalMapDistance} from './original-route-distance.js';
// Native 0x42d110–0x42d23c: final lie flags and follow-up reactions.
export function originalPostLanding(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId,tile=snapshot.landingTile,terrain=snapshot.landingTerrain;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original post-landing actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function scatter(){const v=state.metadata?.[terrain]?.scatterCoefficient;if(!Number.isInteger(v)||v< -128||v>127)throw Error('Original post-landing metadata is unavailable.');return v;}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original post-landing effect requires an explicit resolver.');const e={address,args};calls.push(e);const reply=resolve(structuredClone(e),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original post-landing state.');state=structuredClone(reply.state);return reply.result;}
 if(!tile||![tile.x,tile.z,terrain,snapshot.priorMood,snapshot.visualSlot].every(Number.isInteger))throw Error('Original post-landing locals are unavailable.');
 const valid=()=>{if(tile.x<0||tile.z<0||tile.x>=50||tile.z>=50)return false;if(!(state.terrain instanceof Uint8Array)||state.terrain.length!==2500)throw Error('Original post-landing terrain is unavailable.');return state.terrain[tile.x*50+tile.z]!==20;};
 let a=actor();
 if(terrain!==17&&valid()){
  a.setUint32(0x18,(a.getUint32(0x18,true)&0xfffffffe)|0x400,true);
  if(snapshot.visualSlot!==-1)call(0x4093b0,[snapshot.visualSlot]);
 }
 a=actor();
 if(scatter()<=0&&snapshot.priorMood===a.getUint8(0x78)&&a.getInt8(0x29)<=3){
  const distance=originalMapDistance((a.getInt32(0xcc,true)-a.getInt32(0xdc,true))|0,(a.getInt32(0xd0,true)-a.getInt32(0xe0,true))|0),yards=Math.trunc((Math.imul(distance,25)|0)/1024);
  if(a.getUint8(0x2a)===1&&(a.getUint32(0x18,true)&4)){
   const range=call(0x4219e0,[id]);if(!Number.isInteger(range)||range< -2147483648||range>2147483647)throw Error('Original driver range result is unavailable.');
   if(yards>range&&actor().getInt8(0x29)<=5)call(0x4672d0,[id,51,20]);
  }
 }
 a=actor();
 if(a.getUint8(0x8c)===0&&scatter()>0){
  if(a.getUint32(0x18,true)&0x20)call(0x4672d0,[id,17,20]);
  if(actor().getUint32(0x18,true)&0x40)call(0x4672d0,[id,16,20]);
 }
 return {state,calls,next:'skip'};
}
