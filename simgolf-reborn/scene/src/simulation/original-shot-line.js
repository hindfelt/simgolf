// 0x42889c–0x428992. Projection helpers use semantic coordinate arguments;
// pointer outputs are returned as {x,y,visible}. Drawing is a deferred effect.
export function originalShotLine(snapshot,resolve) {
 let state=structuredClone(snapshot);const calls=[];
 function actor(){const b=state.actors?.[state.actorId];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original shot-line actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 if(!Number.isInteger(state.actorId)||state.actorId<0||state.actorId>=152||!Number.isInteger(state.ballTerrain))throw Error('Original shot-line actor context is unavailable.');
 if(!Number.isInteger(state.globalFlags)||state.globalFlags<0||state.globalFlags>0xffffffff)throw Error('Original shot-line flags are unavailable.');
 let a=actor();
 if(!(state.globalFlags&32)||(a.getInt32(0xec,true)===0&&state.ballTerrain===1))return {state,calls};
 function call(address,args,project=false){
  if(typeof resolve!=='function')throw Error('Original shot-line effect requires an explicit resolver.');
  const event={address,args};calls.push(event);
  const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original shot-line result.');
  if(project&&(!reply.point||![reply.point.x,reply.point.y].every(Number.isInteger)||typeof reply.point.visible!=='boolean'))throw Error('Original shot-line projection result is unavailable.');
  state=structuredClone(reply.state);return reply.point;
 }
 const from=call(0x42f270,[a.getInt32(0xcc,true),a.getInt32(0xd0,true),0],true);
 if(!from.visible)return {state,calls};
 a=actor();const fixed=!!(a.getUint32(0x18,true)&0x10000000),x=a.getInt32(0xd4,true),z=a.getInt32(0xd8,true);
 const to=call(fixed?0x42f270:0x42f020,fixed?[x<<10,z<<10,0]:[x,z],true);
 if(!to.visible)return {state,calls};
 call(0x47edd0,[from.x,from.y,to.x,to.y,0x80006318]);
 a=actor();const target=state.holeTargets?.[a.getInt8(0x29)];
 if(!target||![target.x,target.z].every(Number.isInteger))throw Error('Original shot-line cup target is unavailable.');
 call(0x42f020,[target.x,target.z],true);
 return {state,calls};
}
