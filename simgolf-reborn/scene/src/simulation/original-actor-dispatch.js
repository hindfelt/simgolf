import {originalActorChecks} from './original-actor-checks.js';
import {originalConditionUpdate} from './original-condition-update.js';
import {originalActorMotionGate} from './original-actor-motion-gate.js';
// Contiguous normal-actor prefix 0x42819c–0x42889c (or its early motion/
// skip exits). Normal continuation still requires walking/shot dispatch.
export function originalActorDispatch(snapshot,resolve) {
 const checks=originalActorChecks(snapshot,resolve);let state=checks.state;
 const bytes=state.actors[state.actorId],a=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const ballTile={x:a.getInt32(0xdc,true)>>10,z:a.getInt32(0xe0,true)>>10};
 function terrainAt(s,index){if(!(s.terrain instanceof Uint8Array)||index<0||index>=s.terrain.length)throw Error('Original actor dispatch terrain is unavailable.');return (s.terrain[index]<<24)>>24;}
 // 40bc50 rejects off-map coordinates and code 20; the ball-cell local is
 // sampled before condition callbacks, while the actor-cell code comes after.
 const ballTerrain=ballTile.x<0||ballTile.z<0||ballTile.x>=50||ballTile.z>=50?20:terrainAt(state,ballTile.x*50+ballTile.z);
 const condition=originalConditionUpdate(state,resolve);state=condition.state;
 const actorTile=condition.tile,actorIndex=actorTile.x*50+actorTile.z;
 const actorTerrain=terrainAt(state,actorIndex);
 const gate=originalActorMotionGate(state,resolve);
 return {...gate,calls:[...checks.calls,...condition.calls,...gate.calls],
  randomDraws:checks.randomDraws+condition.randomDraws,visualSlot:checks.visualSlot,centreFlag:0,
  ballTile,ballTerrain,actorTile,actorIndex,actorTerrain};
}
