import {originalAirPhase} from './original-air-phase.js';

// 0x42bf91–0x42c135. The pure physics result is committed before sound;
// collision flags are set only after callback-dependent reaction checks.
export function originalActorAirPhase(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original airborne actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original airborne effect requires a resolver.');const e={address,args};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original airborne state.');state=structuredClone(r.state);return r;}
 let a=actor();const sampled=call(0x42f110,[a.getInt32(0xdc,true),a.getInt32(0xe0,true)]);a=actor();
 const ball={};for(const [name,offset] of [['x',0xdc],['z',0xe0],['height',0xe4],['speed',0xec],['verticalSpeed',0xf0],['angularOffset',0xf4]])ball[name]=a.getInt32(offset,true);ball.heading=a.getUint32(0xe8,true);
 const phase=originalAirPhase({ball,previousTerrainHeight:snapshot.previousTerrainHeight,terrainHeight:sampled.value,cellX:snapshot.ballTile?.x,cellZ:snapshot.ballTile?.z,terrainCode:snapshot.ballTerrain,terrainFlags:snapshot.terrainFlags,variant:state.variant,stateFlags:a.getUint32(0x18,true),skillEnabled:a.getUint8(0x20)!==0,skillMask:a.getUint16(0x1e,true),luck:state.luck,seed:state.seed});
 a.setInt32(0xe4,phase.ball.height,true);a.setInt32(0xec,phase.ball.speed,true);a.setUint32(0xe8,phase.ball.heading,true);state.seed=phase.rngState;
 if(phase.hit){
  call(0x40c1f0,[phase.sound,a.getInt32(0xdc,true),a.getInt32(0xe0,true),0]);a=actor();
  if(!(a.getUint32(0x18,true)&2))call(0x4672d0,[id,12,snapshot.ballTerrain]);
  a=actor();a.setUint32(0x18,a.getUint32(0x18,true)|2,true);
 }
 return {state,calls,hit:phase.hit,randomDraws:phase.draws,next:'0x42c527'};
}
