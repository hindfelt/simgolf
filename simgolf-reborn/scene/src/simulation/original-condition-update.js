import {originalRandom} from './original-rng.js';
const offsets=[[0,0],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
// 0x4285ff–0x4287ef, before walking/motion dispatch. Metadata byte 7
// is the shape field; it must not be confused with byte 6 (kind).
export function originalConditionUpdate(snapshot,resolve) {
 let state=structuredClone(snapshot);const calls=[];let randomDraws=0;
 function actor(){const b=state.actors?.[state.actorId];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original condition actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 if(!Number.isInteger(state.actorId)||state.actorId<0||state.actorId>=152||!Number.isInteger(state.phaseCounter)||state.phaseCounter<0||state.phaseCounter>0xffffffff)throw Error('Invalid original condition snapshot.');
 const first=actor(),x=first.getInt32(8,true)>>10,z=first.getInt32(12,true)>>10;
 const done=()=>({state,calls,randomDraws,tile:{x,z}});
 const period=first.getInt16(0x1c,true)!==0?120:160;
 if(((state.phaseCounter+37*state.actorId)|0)%period!==0||first.getUint8(0x29)===19)return done();
 function draw(bound){const rng=originalRandom(state.seed),value=rng.next(bound||1);state.seed=rng.state;randomDraws+=rng.draws;return bound?value:0;}
 function remark(kind){
  if(typeof resolve!=='function')throw Error('Original condition remark requires an explicit resolver.');
  const event={address:0x4672d0,args:[state.actorId,kind,20]};calls.push(event);
  const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original condition state.');
  state=structuredClone(reply.state);
 }
 if(first.getInt8(0x29)>1&&first.getUint8(0x2b)===0&&first.getInt16(0xa8,true)===0){
  if(!Number.isInteger(state.conditionRange)||state.conditionRange< -0x80000000||state.conditionRange>0x7fffffff)throw Error('Original condition random range is unavailable.');
  if(draw(Math.trunc(state.conditionRange/2)&0xffff)===0)remark(63);
 }
 let special=false;
 for(const [ox,oz] of offsets){
  const index=(x+ox)*50+z+oz;
  if(!(state.terrain instanceof Uint8Array)||index<0||index>=state.terrain.length)throw Error('Original condition terrain sample is unavailable.');
  const shape=state.metadata?.[state.terrain[index]]?.shape;
  if(!Number.isInteger(shape)||shape<0||shape>255)throw Error('Original condition terrain shape is unavailable.');
  if([7,8,14].includes(shape))special=true;
 }
 if(!Number.isInteger(state.environmentByte)||state.environmentByte<0||state.environmentByte>255)throw Error('Original condition environment is unavailable.');
 const adverse=(state.environmentByte===3&&draw(2)!==0)||special;
 let a=actor(),offset;
 if(adverse){if(a.getInt8(0x29)<=2||draw(2)!==0)return done();offset=0xae;}
 else offset=0xb0;
 a=actor();a.setInt16(offset,a.getInt16(offset,true)+1,true);
 const value=a.getInt16(offset,true);
 if(value>=16&&value%4===0){
  if((a.getUint8(0x20)&0xe0)===0x20)a.setInt16(offset,16,true);
  else remark(offset===0xae?15:14);
 }
 return done();
}
