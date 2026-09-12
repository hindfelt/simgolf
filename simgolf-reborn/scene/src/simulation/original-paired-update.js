import {originalMapDistance} from './original-route-distance.js';
const record=(state,id)=>{
 const bytes=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(bytes instanceof Uint8Array)||bytes.length!==256)throw Error('Original paired actor record is unavailable.');
 return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
};
// 0x428272–0x42841a. Uses raw actor records shared by the original remark
// world adapter. The two effect bodies remain explicit synchronous resolvers.
export function originalPairedUpdate(snapshot,resolve) {
 if(!snapshot||![snapshot.phaseCounter,snapshot.lastPairClock].every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff)||
  !Number.isInteger(snapshot.modeByte)||snapshot.modeByte<0||snapshot.modeByte>255||!Number.isInteger(snapshot.detailLevel))throw Error('Invalid original paired update snapshot.');
 let state=structuredClone(snapshot);const calls=[];
 const id=state.actorId,a=record(state,id),flags=a.getUint32(0x18,true);
 const done=triggered=>({state,calls,triggered});
 if(!(flags&0x100000))return done(false);
 const partner=record(state,a.getInt16(0xaa,true)),hole=a.getUint8(0x29),word=a.getInt16(0xba,true);
 if(hole!==partner.getUint8(0x29)||(hole===19&&word===0)||(flags&0x200000))return done(false);
 if(((state.phaseCounter-id*31)&63)!==0)return done(false);
 if([a,partner].some(v=>v.getInt8(0x25)<7||v.getInt8(0x25)===16))return done(false);
 if(((state.phaseCounter-state.lastPairClock)|0)<=150||state.modeByte!==0)return done(false);
 if(word===-6)throw Error('Original paired distance divisor is zero.');
 if(originalMapDistance((a.getInt32(8,true)-partner.getInt32(8,true))|0,(a.getInt32(12,true)-partner.getInt32(12,true))|0)>=Math.trunc(0x3000/(word+6)))return done(false);
 const x=a.getInt32(0x10,true),y=a.getInt32(0x14,true);
 if(state.detailLevel<4||x<=50||x>=750||y<=50||y>=450)return done(false);
 function call(address,args) {
  if(typeof resolve!=='function')throw Error('Original paired effect requires an explicit resolver.');
  const event={address,args};calls.push(event);
  const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply?.state||typeof reply.then==='function'||!Number.isInteger(reply.result))throw Error('Expected synchronous original paired effect result.');
  state=structuredClone(reply.state);return reply.result;
 }
 if(call(0x406dd0,[a.getInt32(8,true),a.getInt32(12,true),8])!==0) {
  const p=record(state,record(state,id).getInt16(0xaa,true));
  p.setUint8(0x3f+p.getInt8(0x29),99);
 }
 call(0x465c40,[id,0]);
 const current=record(state,id);current.setUint32(0x18,current.getUint32(0x18,true)|0x200000,true);
 const other=record(state,current.getInt16(0xaa,true));other.setUint32(0x18,other.getUint32(0x18,true)|0x200000,true);
 return done(true);
}
