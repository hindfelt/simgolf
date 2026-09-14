import {originalMapDistance} from './original-route-distance.js';
// Native 0x42cc88–0x42ceb2: wear and pre-penalty landing reactions.
export function originalLandingReactions(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId,tile=snapshot.landingTile,terrain=snapshot.landingTerrain;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original landing actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 if(!tile||![tile.x,tile.z,terrain].every(Number.isInteger))throw Error('Original landing locals are unavailable.');
 const index=tile.x*50+tile.z;
 function codeAt(x,z){const i=x*50+z;if(!(state.terrain instanceof Uint8Array)||i<0||i>=state.terrain.length)throw Error('Original landing terrain is unavailable.');return (state.terrain[i]<<24)>>24;}
 function scatter(code){const value=state.metadata?.[code]?.scatterCoefficient;if(!Number.isInteger(value)||value< -128||value>127)throw Error('Original landing metadata is unavailable.');return value;}
 function marked(){if(!(state.tileFlags instanceof Uint16Array)||index<0||index>=state.tileFlags.length)throw Error('Original landing flags are unavailable.');return !!(state.tileFlags[index]&0x100);}
 function remark(kind){if(typeof resolve!=='function')throw Error('Original landing reaction requires an explicit resolver.');const event={address:0x4672d0,args:[id,kind,terrain]};calls.push(event);const reply=resolve(structuredClone(event),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original landing reaction.');state=structuredClone(reply.state);}
 const valid=tile.x>=0&&tile.z>=0&&tile.x<50&&tile.z<50&&codeAt(tile.x,tile.z)!==20;
 if(valid){if(!(state.tileWear instanceof Uint8Array)||index>=state.tileWear.length)throw Error('Original landing wear is unavailable.');if(state.tileWear[index]<255)state.tileWear[index]++;}
 let a=actor();const priorMood=a.getUint8(0x78),done=next=>({state,calls,priorMood,next});
 const pose=animation=>{a=actor();a.setUint8(0x25,animation);a.setInt16(0xa6,-99,true);a.setUint8(0x22,(a.getUint8(0x22)-2)&7);};
 if(scatter(terrain)<=0&&valid){
  if(a.getInt8(0x23)<=8)return done('0x42d110');
  const cup=state.holeTargets?.[a.getInt8(0x29)];if(!cup||![cup.x,cup.z].every(Number.isInteger))throw Error('Original landing cup is unavailable.');
  const fromDistance=originalMapDistance((a.getInt32(0xcc,true)>>10)-cup.x,(a.getInt32(0xd0,true)>>10)-cup.z);
  if(originalMapDistance(tile.x-cup.x,tile.z-cup.z)<fromDistance){pose(12);remark(1);}
  return done('0x42d110');
 }
 if(!Number.isInteger(state.difficulty))throw Error('Original landing difficulty is unavailable.');
 if(a.getInt8(0x23)<((state.difficulty+3)|0)&&!(a.getUint32(0x18,true)&2)&&!marked()){pose(13);remark(2);}
 a=actor();const source=codeAt(a.getInt32(0xcc,true)>>10,a.getInt32(0xd0,true)>>10),sourceScatter=scatter(source);
 if(sourceScatter>0&&scatter(terrain)>=sourceScatter&&!marked()){
  if(a.getUint8(0x25)!==13){a.setUint8(0x25,13);a.setUint8(0x22,(a.getUint8(0x22)-2)&7);}
  a.setInt16(0xa6,-99,true);remark(terrain===source?2:3);a=actor();a.setUint32(0x18,a.getUint32(0x18,true)|0x20000,true);
 }
 return done('0x42ceb2');
}
