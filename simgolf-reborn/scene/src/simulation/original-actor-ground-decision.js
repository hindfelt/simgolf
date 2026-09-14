import {originalTerrainByte} from './original-terrain-byte.js';
import {originalActorGroundResponse} from './original-actor-ground-response.js';
import {originalGroundContact} from './original-ground-contact.js';
import {originalCupCapture} from './original-cup.js';
// Rolling response through the capture branch, before sound or cup snap.
export function originalActorGroundDecision(snapshot,resolve){
 const response=originalActorGroundResponse(snapshot,resolve),state=response.state;
 const b=state.actors[state.actorId],a=new DataView(b.buffer,b.byteOffset,b.byteLength),{x:cellX,z:cellZ}=snapshot.ballTile;
 const terrainAt=(x,z)=>originalTerrainByte(state,x,z);
 const contact=originalGroundContact({speed:a.getInt32(0xec,true),terrainCode:snapshot.ballTerrain,boundaryFlags:snapshot.boundaryFlags,subX:snapshot.subX,subZ:snapshot.subZ,cellX,cellZ,centreFlag:snapshot.centreFlag},terrainAt);
 a.setInt32(0xec,contact.speed,true);state.centreFlag=contact.centreFlag;
 const capture=cellX<0||cellX>=50||cellZ<0||cellZ>=50?null:originalCupCapture({x:a.getInt32(0xdc,true),z:a.getInt32(0xe0,true),cellX,cellZ,terrainCode:terrainAt(cellX,cellZ),cellFlags:state.tileFlags[cellX*50+cellZ],speed:contact.speed,club:a.getUint8(0x24),eventFlag:!!(state.worldFlags&0x200000)});
 return {...response,state,captured:!!capture,next:capture?'0x42c3f4':'0x42c47c'};
}
