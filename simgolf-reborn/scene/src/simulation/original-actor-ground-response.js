import {originalTerrainByte} from './original-terrain-byte.js';
import {originalGreenTurnStep} from './original-putting.js';
// 0x42c13a–0x42c27b. Sample callbacks may mutate actor and terrain state.
export function originalActorGroundResponse(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original rolling actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 const terrain=(x,z)=>originalTerrainByte(state,x,z);
 function slope(direction){const a=actor(),e={address:0x40c140,args:[a.getInt32(0xdc,true),a.getInt32(0xe0,true),direction]};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||!Number.isInteger(r.value)||typeof r.then==='function')throw Error('Expected original rolling slope sample.');state=structuredClone(r.state);return r.value;}
 const forward=slope(snapshot.direction);let resistance=Math.max(0,Math.min(99,(state.rollCoefficient-forward)|0)),cross=slope((snapshot.direction+2)&7);
 if(resistance<2&&snapshot.boundaryFlags!==0)resistance=2;
 const a=actor();if(terrain(a.getInt32(0xcc,true)>>10,a.getInt32(0xd0,true)>>10)===1){resistance=state.rollCoefficient;cross=0;}
 a.setUint32(0xe8,a.getUint32(0xe8,true)-Math.trunc((cross<<26)/2),true);
 const speed=a.getInt32(0xec,true);a.setInt32(0xec,resistance<5?speed-Math.trunc((speed>>resistance)/2):speed+Math.trunc((64-(speed>>5))/2),true);
 const turn=originalGreenTurnStep({heading:a.getUint32(0xe8,true),angularOffset:a.getInt32(0xf4,true),terrainCode:terrain(snapshot.ballTile.x,snapshot.ballTile.z),phaseCounter:state.phaseCounter,seed:state.seed});
 a.setUint32(0xe8,turn.heading,true);a.setInt32(0xf4,turn.angularOffset,true);state.seed=turn.rngState;
 return {state,calls,resistance,randomDraws:turn.draws,next:'0x42c27b'};
}
