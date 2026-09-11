import {originalShotRange} from './original-shot-range.js';
// Original planner entry through 0x42365d. Range is evaluated BEFORE the
// flag-1 mutation of terrain 17/20 shot classes. Return patches explicitly.
export function originalPlannerSetup(q,map) {
 const originTile={x:q.x>>10,z:q.z>>10};
 const terrainCode=map.terrainAt(originTile.x,originTile.z);
 const effectiveLie=q.actorId>=152?(q.rangeInput.shot?2:0):terrainCode;
 const range=originalShotRange({...q.rangeInput,actorId:q.actorId,surface:terrainCode,
  shotClass:map.shotClassAt(effectiveLie)});
 const shotClassOverrides=q.actorFlags&1?[{code:17,shotClass:32},{code:20,shotClass:32}]:[];
 const obstacleIndex=(q.worldFlags&0x20)&&q.obstacleCount>0?(q.obstacleCount-1)|0:-1;
 return {range,originTile,originIndex:(Math.imul(originTile.x,50)+originTile.z)|0,terrainCode,obstacleIndex,shotClassOverrides};
}
