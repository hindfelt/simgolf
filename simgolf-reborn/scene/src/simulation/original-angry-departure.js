import {originalRandom} from './original-rng.js';
// 0x428f64–0x429024: angry golfer complaint or clubhouse destination.
export function originalAngryDeparture(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original departure actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let a=actor();if(!(a.getUint32(0x18,true)&0x20000000))return {state,calls,randomDraws:0,next:'0x429024'};
 if(((state.phaseCounter+Math.imul(id,35))|0)%100!==0){
  const t=state.clubhouseTile;if(!t||![t.x,t.z].every(Number.isInteger))throw Error('Original clubhouse destination unavailable.');
  return {state,calls,randomDraws:0,destination:{x:((t.x<<10)+512)|0,z:((t.z<<10)+512)|0},next:'0x429f27'};
 }
 const e={address:0x4672d0,args:[id,35,20]};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous departure reaction.');state=structuredClone(r.state);a=actor();a.setUint8(0x25,13);
 const rng=originalRandom(state.seed),flip=rng.next(2);state.seed=rng.state;
 a.setUint32(0x18,flip?a.getUint32(0x18,true)|0x20000:a.getUint32(0x18,true)&~0x20000,true);a.setInt16(0xa6,-99,true);a.setInt16(0xac,a.getInt16(0xac,true)-1,true);
 if(a.getInt16(0xac,true)<-10)a.setUint8(0x29,0);
 return {state,calls,randomDraws:1,next:'skip'};
}
