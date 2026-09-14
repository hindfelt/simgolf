// Golfer actors start at 0x577f00; remark actors start at 0x577f08.
// Golfer holes start at 0x574500; remark holes start at 0x5744f8.
// Preserve the boundary bytes explicitly instead of shifting fields in place.
function table(records,count,size,label){
 if(!Array.isArray(records)||records.length!==count||records.some(b=>!(b instanceof Uint8Array)||b.length!==size))throw Error(`Original ${label} records unavailable.`);
 const bytes=new Uint8Array(count*size);records.forEach((b,i)=>bytes.set(b,i*size));return bytes;
}
function boundary(bytes,label){if(!(bytes instanceof Uint8Array)||bytes.length<8)throw Error(`Original ${label} boundary unavailable.`);return bytes;}
const split=(bytes,count,size,offset=0)=>Array.from({length:count},(_,i)=>bytes.slice(offset+i*size,offset+(i+1)*size));
export function originalRemarkRecordView(snapshot){
 const state=structuredClone(snapshot),actors=table(state.actors,152,256,'golfer actor'),holes=table(state.holes,20,520,'golfer hole');
 const actorBytes=new Uint8Array(actors.length+8);actorBytes.set(actors);actorBytes.set(boundary(state.actorTail,'actor tail').subarray(0,8),actors.length);
 const holeBytes=new Uint8Array(holes.length+8);holeBytes.set(boundary(state.holePrefix,'hole prefix').subarray(0,8));holeBytes.set(holes,8);
 state.actors=split(actorBytes,152,256,8);state.holeRecords=split(holeBytes,20,520);
 return state;
}
export function applyOriginalRemarkRecordView(snapshot,remarkWorld){
 const originalActors=table(snapshot.actors,152,256,'golfer actor'),originalHoles=table(snapshot.holes,20,520,'golfer hole');
 const remarkActors=table(remarkWorld.actors,152,256,'remark actor'),remarkHoles=table(remarkWorld.holeRecords,20,520,'remark hole');
 const state=structuredClone(remarkWorld),actorBytes=new Uint8Array(originalActors.length+8),holeBytes=new Uint8Array(originalHoles.length+8);
 actorBytes.set(originalActors);actorBytes.set(remarkActors,8);holeBytes.set(originalHoles,8);holeBytes.set(remarkHoles);
 state.actors=split(actorBytes,152,256);state.actorTail=boundary(snapshot.actorTail,'actor tail').slice();state.actorTail.set(actorBytes.subarray(originalActors.length),0);
 state.holes=split(holeBytes,20,520,8);state.holeRecords=state.holes;
 state.holePrefix=boundary(snapshot.holePrefix,'hole prefix').slice();state.holePrefix.set(holeBytes.subarray(0,8),0);
 return state;
}
