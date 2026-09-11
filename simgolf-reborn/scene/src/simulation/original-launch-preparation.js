import {originalTargetAssessment} from './original-target-ray.js';
import {originalElevationDistance} from './original-elevation-distance.js';
import {originalLaunchTerrain} from './original-launch-terrain.js';
import {originalShotClub} from './original-shot-club.js';
// 0x423b66–0x424988: shared preparation before exact/automatic paths diverge.
// Target/range are already selected. The returned assessment rating and
// dominant terrain/direction also feed the automatic reaction stages.
export function originalLaunchPreparation(q,cache,map) {
 const origin={x:q.x,z:q.z},originTile={x:q.x>>10,z:q.z>>10};
 const assessment=originalTargetAssessment({...q,origin,originTile},map);
 const distance=originalElevationDistance({...q,origin:originTile},map.heightAt);
 const terrainCode=map.terrainAt(originTile.x,originTile.z);
 const input={...q,distance,terrainCode,firstWaterIndex:assessment.firstWaterIndex,
  assessmentSpan:assessment.span,seed:assessment.seed,shotClass:map.shotClassAt(terrainCode),
  targetTerrainCode:map.terrainAt(q.target.x,q.target.z),tileFlags:map.marksAt(originTile.x,originTile.z)};
 const prepared=originalLaunchTerrain(input,cache,p=>map.kindAt(map.terrainAt(p.x,p.z)));
 return {...prepared,assessment,distance,terrainCode,strength:originalShotClub(input).strength};
}
