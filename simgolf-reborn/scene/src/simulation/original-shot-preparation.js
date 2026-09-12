import {originalRouteSegment} from './original-route-distance.js';

// 0x42b55c–0x42b825. First-hole tutorial UI at 0x42b647 is an explicit
// continuation; resume at 0x42b6f8 after its effects, rather than skipping it.
export function originalShotPreparation(snapshot,resolve,entry='0x42b55c') {
 let state=structuredClone(snapshot);const calls=[];
 const id=state.actorId;
 function actor(index=id){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original shot preparation actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let a=actor(),manual;
 if(entry==='0x42b55c'){
  if(!Number.isInteger(state.ballTerrain))throw Error('Original ball terrain local is unavailable.');
  manual=!!(a.getUint32(0x18,true)&0x200)&&state.ballTerrain!==1;
  if(manual)manual=originalRouteSegment({x:a.getInt32(0xdc,true),z:a.getInt32(0xe0,true)},state.holeTargets?.[a.getInt8(0x29)])>=25;
  if(manual&&a.getInt32(0xd4,true)===0){
   if(a.getInt32(0x10,true)===-1){state.aimX=a.getInt32(8,true)>>10;state.aimZ=a.getInt32(12,true)>>10;}
   a.setInt32(0xd4,-1,true);state.aimScratch=0;state.aimMode=10;
   if(a.getUint8(0x29)===1&&(actor(a.getInt16(0xaa,true)).getUint8(0x20)&0xe0)===0x20&&a.getUint8(0x2a)===0&&!(state.globalFlags&0x200000))return {state,calls,next:'0x42b647'};
  }
 }else if(entry==='0x42b6f8')manual=true;
 else throw Error('Unsupported original shot preparation continuation.');
 if(manual){
  if(a.getInt32(0xd4,true)===-1){state.selectionMode=3;state.selectedActor=id;state.aimResult=0;a.setUint8(0x25,11);return {state,calls,next:'skip'};}
 }else{
  if(!Number.isInteger(state.updateScratch))throw Error('Original planner update budget is unavailable.');
  if(state.updateScratch!==0)return {state,calls,next:'skip'};
 }
 if(typeof resolve!=='function')throw Error('Original shot planner requires an explicit resolver.');
 const event={address:0x4235c0,args:[id,manual?1:0,-1,0,0]};calls.push(event);
 const reply=resolve(structuredClone(event),structuredClone(state));
 if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original planner state.');
 state=structuredClone(reply.state);a=actor();
 a.setUint8(0x22,((((a.getInt32(0xe8,true)>>28)&15)+1)>>1)&7);
 // These are pre-planner stack locals, not potentially modified world fields.
 if(snapshot.ballTerrain===1){
  const index=a.getInt8(0xc2)+(a.getUint8(0x21)&7)*4,hole=a.getInt8(0x29),tile=snapshot.ballTile;
  // Packed records are authoritative when present. Re-read after planner
  // effects so an older counter projection cannot overwrite current statistics.
  let statRecord,holeRecord;
  if(state.statRecords){
   const record=state.statRecords[index];
   if(!(record instanceof Uint8Array)||record.length!==184)throw Error('Original putt statistic record is unavailable.');
   statRecord=new DataView(record.buffer,record.byteOffset,record.byteLength);
   if(!(state.shotStatCounts instanceof Uint32Array))state.shotStatCounts=new Uint32Array(state.statRecords.length);
   state.shotStatCounts[index]=statRecord.getUint32(12,true);
  }
  if(state.holes){
   const record=state.holes[hole];
   if(!(record instanceof Uint8Array)||record.length!==520)throw Error('Original putt hole record is unavailable.');
   holeRecord=new DataView(record.buffer,record.byteOffset,record.byteLength);
   if(!(state.holeStrokeTotals instanceof Uint16Array))state.holeStrokeTotals=new Uint16Array(state.holes.length);
   state.holeStrokeTotals[hole]=holeRecord.getUint16(0x162,true);
  }
  if(!(state.shotStatCounts instanceof Uint32Array)||index<0||index>=state.shotStatCounts.length||!(state.holeStrokeTotals instanceof Uint16Array)||hole<0||hole>=state.holeStrokeTotals.length||!tile||![tile.x,tile.z].every(n=>Number.isInteger(n)&&n>=0&&n<50)||!(state.tileFlags instanceof Uint16Array)||tile.x*50+tile.z>=state.tileFlags.length)throw Error('Original putt accounting context is unavailable.');
  state.shotStatCounts[index]++;state.holeStrokeTotals[hole]++;
  if(statRecord)statRecord.setUint32(12,state.shotStatCounts[index],true);
  if(holeRecord)holeRecord.setUint16(0x162,state.holeStrokeTotals[hole],true);
  if(state.holeRecords&&state.holes)state.holeRecords=state.holes;
  if(!(state.tileFlags[tile.x*50+tile.z]&0x80)){a.setInt16(0xa6,-25,true);a.setUint8(0x26,0);}
 }
 a.setInt32(0xcc,a.getInt32(0xdc,true),true);a.setInt32(0xd0,a.getInt32(0xe0,true),true);
 if(a.getUint8(0x25)!==14)a.setUint8(0x25,11);
 a.setUint8(0x28,1);
 return {state,calls,next:'skip'};
}
