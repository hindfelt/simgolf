import {originalRandom} from './original-rng.js';
const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
// 0x42a026–0x42a168: rest delay, reaction, random adjacent standing position.
export function originalRestArrival(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];let randomDraws=0;
 function actor(){const b=state.actors?.[id];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original resting actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function effect(address,args){const event={address,args};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous rest effect.');state=structuredClone(r.state);return r.value;}
 const {x,z}=state.actorTile??{},decoration=state.restDecoration;
 if(![x,z].every(Number.isInteger)||!Number.isInteger(decoration)||decoration<0||decoration>255)throw Error('Original rest tile unavailable.');
 let a=actor();a.setInt16(0xa6,Math.trunc(-a.getInt16(0xb2,true)*8/20),true);a.setUint8(0x25,17);a.setUint32(0x18,a.getUint32(0x18,true)&~0x1000,true);
 if(decoration%7===5){a.setInt16(0xac,a.getInt16(0xac,true)+2,true);effect(0x40c1f0,[261,(x<<10)+512,(z<<10)+512,0]);effect(0x4672d0,[id,47,20]);}
 else effect(0x4672d0,[id,27,20]);
 do{
  const rng=originalRandom(state.seed),direction=rng.next(4)*2;state.seed=rng.state;randomDraws++;
  const available=effect(0x4071d0,[x,z,direction]);a=actor();
  if(available){a.setInt32(8,(x<<10)+512+DX[direction]*511,true);a.setInt32(12,(z<<10)+512+DZ[direction]*511,true);a.setInt16(0xb2,0,true);a.setUint8(0x22,direction);}
  else a.setInt16(0xb2,a.getInt16(0xb2,true)-1,true);
 }while(actor().getInt16(0xb2,true)!==0);
 actor().setUint8(0x28,0);
 return {state,calls,randomDraws,next:'0x42a168'};
}
