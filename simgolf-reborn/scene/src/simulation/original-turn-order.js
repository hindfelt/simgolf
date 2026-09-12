import {originalRouteSegment} from './original-route-distance.js';
// 0x428992–0x428ad1: partner refresh, ready-state and relative cup distance.
export function originalTurnOrder(snapshot,resolve) {
 let state=structuredClone(snapshot);const calls=[];
 function actor(id){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original turn-order actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const id=state.actorId;let a=actor(id),p=actor(a.getInt16(0xaa,true));
 if(p.getUint8(0x29)===0&&a.getUint8(0x2a)===0&&a.getUint8(0x29)!==19){
  if(typeof resolve!=='function')throw Error('Original partner refresh requires an explicit resolver.');
  const event={address:0x425b50,args:[id]};calls.push(event);
  const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original turn-order state.');
  state=structuredClone(reply.state);
 }
 a=actor(id);p=actor(a.getInt16(0xaa,true));
 const partnerHole=p.getUint8(0x29),sameHole=partnerHole===a.getUint8(0x29);
 const partnerNotReady=partnerHole!==0&&sameHole&&!!(a.getUint32(0x18,true)&0x400)&&!(p.getUint32(0x18,true)&0x400);
 let closerToCup=false;
 if((a.getUint32(0x18,true)&0x400)&&a.getInt32(0xdc,true)!==0&&p.getInt32(0xdc,true)!==0&&sameHole){
  const hole=a.getInt8(0x29),target=state.holeTargets?.[hole];
  const distance=v=>originalRouteSegment({x:v.getInt32(0xdc,true),z:v.getInt32(0xe0,true)},target);
  const partnerDistance=distance(p);closerToCup=distance(a)<partnerDistance;
 }
 const next=a.getInt32(0xdc,true)!==0&&a.getUint8(0x28)!==0&&!partnerNotReady&&!(a.getUint32(0x18,true)&0x20000000)?'0x42b3f2':'0x428ad1';
 return {state,calls,partnerNotReady,closerToCup,next};
}
