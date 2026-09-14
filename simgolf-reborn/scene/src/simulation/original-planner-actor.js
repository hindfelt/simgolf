// Packed 0x577f00-based actor views used by the automatic planner. Recovery
// is physically at +0x100, in the next slot (or explicit tail after slot 151).
const bytes={marker:0x82,reaction:0x8c,actorClass:0x20,hole:0x29,shotCounter:0x2a,skillMask:0x21,club:0x24,elevationCounter:0x23};
const words={stateCode:0xb4,profileIndex:0xbe,conditionFlags:0x90,usedClubs:0xa8};
function views(state,id){
 const b=state.actors?.[id],tail=id===151?state.actorTail:state.actors?.[id+1];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256||!(tail instanceof Uint8Array)||tail.length<1)throw Error('Original planner actor backing records unavailable.');
 return {a:new DataView(b.buffer,b.byteOffset,b.byteLength),tail};
}
export function originalPlannerActor(state,id=state.actorId){
 const {a,tail}=views(state,id),actor={};
 for(const [key,offset] of Object.entries(bytes))actor[key]=a.getUint8(offset);
 for(const [key,offset] of Object.entries(words))actor[key]=a.getUint16(offset,true);
 return {...actor,recoveryValue:tail[0],actorFlags:a.getUint32(0x18,true),angularOffset:a.getInt32(0xf4,true),target:{x:a.getInt32(0xd4,true),z:a.getInt32(0xd8,true)}};
}
// Apply planner-owned outputs on a clone; unrelated actor bytes are retained.
export function applyOriginalPlannerActor(snapshot,result,id=snapshot.actorId){
 const state=structuredClone(snapshot),{a,tail}=views(state,id),actor=result.actor;
 const integer=(n,min,max)=>{if(!Number.isInteger(n)||n<min||n>max)throw Error('Invalid original planner actor output.');return n;};
 for(const [key,offset] of Object.entries(bytes))a.setUint8(offset,integer(actor[key],0,255));
 for(const [key,offset] of Object.entries(words))a.setUint16(offset,integer(actor[key],key==='stateCode'?-32768:0,65535),true);
 tail[0]=integer(actor.recoveryValue,0,255);
 a.setUint32(0x18,integer(actor.actorFlags,0,0xffffffff),true);
 a.setInt32(0xf4,integer(actor.angularOffset,-0x80000000,0x7fffffff),true);
 a.setInt32(0xd4,integer(actor.target.x,-0x80000000,0x7fffffff),true);a.setInt32(0xd8,integer(actor.target.z,-0x80000000,0x7fffffff),true);
 for(const [key,offset] of [['speed',0xec],['verticalSpeed',0xf0]])a.setInt32(offset,integer(result[key],-0x80000000,0x7fffffff),true);
 a.setUint32(0xe8,integer(result.heading,0,0xffffffff),true);
 return state;
}
