import {originalRandom} from './original-rng.js';
// 0x42c648–0x42c815: ordered slope queries and contact terrain lookup.
export function originalActorImpact(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original impact actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function query(address,args){const e={address,args};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||!Number.isInteger(r.value)||typeof r.then==='function')throw Error('Expected synchronous original impact sample.');state=structuredClone(r.state);return r.value;}
 const clamp=v=>Math.max(-2,Math.min(2,v));
 let a=actor(),flags=a.getUint32(0x18,true);
 if(flags&256){a.setUint32(0xe8,a.getUint32(0xe8,true)^0x80000000,true);flags&=~256;a.setUint32(0x18,flags,true);}
 if(flags&128){a.setInt32(0xec,Math.trunc(a.getInt32(0xec,true)/2),true);a.setUint32(0x18,(flags&~128)|256,true);}
 const cross=((((a.getInt32(0xe8,true)>>29)+1)&~1)+2)&7,multiplier=Math.imul(a.getInt32(0xf0,true),0xaec33);
 let slope=query(0x40c140,[a.getInt32(0xdc,true),a.getInt32(0xe0,true),cross]);a=actor();a.setUint32(0xe8,a.getUint32(0xe8,true)-Math.imul(slope,multiplier),true);
 slope=query(0x40c140,[a.getInt32(0xdc,true),a.getInt32(0xe0,true),snapshot.direction]);a=actor();a.setInt32(0xec,a.getInt32(0xec,true)-(Math.imul(clamp(slope),a.getInt32(0xf0,true))<<1),true);
 const vertical=a.getInt32(0xf0,true);slope=query(0x40c140,[a.getInt32(0xdc,true),a.getInt32(0xe0,true),snapshot.direction]);a=actor();a.setInt32(0xf0,vertical+Math.trunc(Math.imul(clamp(slope),vertical)/2),true);
 const rng=originalRandom(state.seed),coefficient=state.scatterCoefficient;
 if(coefficient>0){const c=Math.max(1,Math.min(3,coefficient));a.setUint32(0xe8,a.getUint32(0xe8,true)+rng.next((c*0x1111*10)&65535)-Math.trunc(Math.imul(c,0x0aaaaaaa)/2),true);}
 state.seed=rng.state;
 const terrain=query(0x40bc90,[a.getInt32(0xdc,true),a.getInt32(0xe0,true)]),stoppedByTerrain=terrain===17&&snapshot.boundaryFlags===0;
 if(stoppedByTerrain){a=actor();a.setInt32(0xf0,0,true);a.setInt32(0xec,0,true);state.terrainStopX=a.getInt32(0xdc,true);state.terrainStopZ=a.getInt32(0xe0,true);state.terrainStopState=0;}
 return {state,calls,randomDraws:rng.draws,stoppedByTerrain,next:'0x42c815'};
}
