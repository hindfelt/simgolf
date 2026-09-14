import {originalRandom} from './original-rng.js';
const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
// 0x42aa30–0x42abda: route request, reversal adjustment and step budget.
export function originalWalkingFarRoute(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];let randomDraws=0;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original routing actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function effect(address,args){const event={address,args};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous routing effect.');state=structuredClone(r.state);return r.value;}
 let a=actor();if(a.getInt16(0x1c,true)>0)return {state,calls,randomDraws,next:'0x42a758'};
 const index=state.actorIndex;if(!Number.isInteger(index)||index<0||index>=2500||!(state.terrain instanceof Uint8Array)||!(state.tileFlags instanceof Uint16Array))throw Error('Original routing tile unavailable.');
 const flags=state.tileFlags[index];
 if(state.terrain[index]===17&&(flags&32)&&(flags&256)&&(a.getUint8(0x8d)&127)!==7){
  const bit=flags&7;effect(0x4672d0,[id,7,0]);const rng=originalRandom(state.seed),clear=rng.next(5);state.seed=rng.state;randomDraws++;a=actor();a.setUint8(0xc4,(a.getUint8(0xc4)&~(1<<clear))|(1<<bit));
 }
 state.worldFlags=(state.worldFlags&~0x80000)>>>0;a=actor();
 const destination=state.destination;if(!destination||![destination.x,destination.z].every(Number.isInteger))throw Error('Original routing destination unavailable.');
 const heading=effect(0x42def0,[destination.x,destination.z,a.getInt32(8,true),a.getInt32(12,true),id]);
 if(!Number.isInteger(heading)||heading<0||heading>7)throw Error('Original route direction unavailable.');
 a=actor();a.setUint8(0x22,heading);state.worldFlags=(state.worldFlags&~0x1000)>>>0;
 if(state.reversalCheck&&heading===(state.previousFacing^4))a.setUint8(0x22,(heading+(state.phaseCounter&16?1:-1))&7);
 const facing=a.getUint8(0x22),x=(a.getInt32(8,true)>>6)&15,z=(a.getInt32(12,true)>>6)&15;
 let budget=DX[facing]===1?24-x:DX[facing]===-1?x+8:DZ[facing]===1?24-z:z+8;
 if((facing&1)&&budget>16)budget=16;
 budget--;if(state.worldFlags&0x80000)budget=3;
 a.setInt16(0x1c,budget,true);
 return {state,calls,randomDraws,next:'0x42abda'};
}
