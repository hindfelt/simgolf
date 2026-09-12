import {originalRandom} from './original-rng.js';
const dx=[0,1,1,1,0,-1,-1,-1],dz=[-1,-1,0,1,1,1,0,-1];
// 0x42841a–0x42858d. Same typed records as original remark-world state.
export function originalSceneryUpdate(snapshot,resolve) {
 let state=structuredClone(snapshot);const calls=[];
 const id=state.actorId,bytes=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(bytes instanceof Uint8Array)||bytes.length!==256||
  !Number.isInteger(state.phaseCounter)||state.phaseCounter<0||state.phaseCounter>0xffffffff)throw Error('Invalid original scenery actor snapshot.');
 const a=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),flags=a.getUint16(0x90,true);
 let mask=flags&0xc000?0x1ff:0xff;
 if(flags&0x4000)mask>>=2;
 if(a.getInt16(0x1c,true)>0)mask>>=1;
 const done=(sample=null,randomDraws=0)=>({state,calls,sample,randomDraws});
 if(((state.phaseCounter+33*id)&mask)!==0||(bytes[0x78]&127)===11||(bytes[0x79]&127)===11)return done();
 const rng=originalRandom(state.seed),direction=(bytes[0x22]+rng.next(5)-2)&7;
 state.seed=rng.state;
 const x=(a.getInt32(8,true)>>10)+dx[direction],z=(a.getInt32(12,true)>>10)+dz[direction],index=x*50+z;
 const sample={x,z,index,remarkIndex:z*50+x};
 function cell(array,Type){if(!(array instanceof Type)||index<0||index>=array.length)throw Error('Original scenery map sample is unavailable.');return array[index];}
 function call(address,args){
  if(typeof resolve!=='function')throw Error('Original scenery callback requires an explicit resolver.');
  const event={address,args};calls.push(event);
  const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply?.state||typeof reply.then==='function'||!Number.isInteger(reply.result))throw Error('Expected synchronous original scenery result.');
  state=structuredClone(reply.state);return reply.result;
 }
 if(cell(state.terrain,Uint8Array)===22){
  const buildingIndex=call(0x40dc70,[x,z]),b=state.buildings?.[buildingIndex];
  if(!(b instanceof Uint8Array)||b.length!==16)throw Error('Original scenery building record is unavailable.');
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength),type=v.getInt16(0,true);
  if(type===2||type===4)call(0x4672d0,[id,type===4&&v.getInt32(8,true)>=16?20:11,sample.remarkIndex]);
 }
 if(cell(state.tileFlags,Uint16Array)&0x1000){
  const response=call(0x466ea0,[id]);
  if(response===2||(cell(state.tileFlags,Uint16Array)&0x800))call(0x4672d0,[id,(cell(state.tileFlags,Uint16Array)&0x800)?20:11,sample.remarkIndex]);
 }
 return done(sample,rng.draws);
}
