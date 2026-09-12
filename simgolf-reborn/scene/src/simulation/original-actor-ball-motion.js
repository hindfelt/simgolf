import {originalTerrainByte} from './original-terrain-byte.js';
import {originalActorPositionStep} from './original-actor-position-step.js';
import {originalMotionSample} from './original-motion-sample.js';
import {originalGroundResolution} from './original-ground-resolution.js';
import {originalAirborneMotion} from './original-airborne-motion.js';
import {originalResolveStoppedMotion} from './original-contact-resolution.js';
// 0x42bdc3 through motion continuation or ordinary shot/hole completion.
// ballTile/ballTerrain are the pre-movement locals supplied by the actor loop.
export function originalActorBallMotion(snapshot,resolve,resolveSpecial){
 const position=originalActorPositionStep(snapshot,resolve),state=position.state;
 if(state.holeRecords)state.holes=state.holeRecords;
 const b=state.actors[state.actorId],a=new DataView(b.buffer,b.byteOffset,b.byteLength),tile=snapshot.ballTile;
 const sample=originalMotionSample({x:a.getInt32(0xdc,true),z:a.getInt32(0xe0,true),heading:a.getUint32(0xe8,true),cellX:tile.x,cellZ:tile.z,terrainCode:snapshot.ballTerrain},(x,z)=>originalTerrainByte(state,x,z));
 Object.assign(state,sample,{previousTerrainHeight:position.previousTerrainHeight,stepX:position.stepX,stepCosine:position.stepCosine,ballTile:tile,ballTerrain:snapshot.ballTerrain});
 const result=a.getInt32(0xe4,true)<=1?originalGroundResolution(state,resolve,resolveSpecial):originalResolveStoppedMotion(originalAirborneMotion(state,resolve),resolve);
 return {...result,calls:[...position.calls,...result.calls]};
}
