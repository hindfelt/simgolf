// Native 0x42c3f4–0x42c47c, after the motion cup predicate succeeds.
// This exits directly; it must not also run ordinary stopped-shot accounting.
export function originalCupCompletion(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId,tile=snapshot.ballTile,visual=snapshot.visualSlot;
 if(!tile||![tile.x,tile.z].every(n=>Number.isInteger(n)&&n>=0&&n<50)||!Number.isInteger(visual)||visual< -1||visual>15)throw Error('Original cup completion locals are unavailable.');
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original cup completion actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original cup completion requires an explicit resolver.');const e={address,args};calls.push(e);const reply=resolve(structuredClone(e),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original cup completion state.');state=structuredClone(reply.state);}
 let a=actor();call(0x40c1f0,[4,a.getInt32(0xdc,true),a.getInt32(0xe0,true),0]);
 a=actor();a.setInt32(0xdc,(tile.x<<10)+512,true);a.setInt32(0xe0,(tile.z<<10)+512,true);
 if(visual!==-1)call(0x4093b0,[visual]);
 a=actor();a.setUint8(0x2a,a.getUint8(0x2a)+1);call(0x426b00,[id]);
 a=actor();a.setInt32(0xec,0,true);a.setUint32(0x18,a.getUint32(0x18,true)&0xfffbffff,true);
 return {state,calls,next:'skip'};
}
