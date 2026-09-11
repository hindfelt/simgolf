import {originalTargetAssessment} from './original-target-ray.js';
import {originalElevationDistance} from './original-elevation-distance.js';
import {originalSelectedLaunch} from './original-selected-launch.js';
// 0x423b66–0x425ab9 for an already-selected target (planner argument != -1).
// All terrain stages consult one map revision. Earlier target/range selection
// remains the caller's responsibility; this does not implement automatic search.
export function originalAssessedLaunch(q,cache,map) {
 if(!Number.isInteger(q.plannerArgument)||q.plannerArgument===-1)throw Error('Assessed launch requires a resolved planner argument.');
 const origin={x:q.x,z:q.z},originTile={x:q.x>>10,z:q.z>>10};
 const assessment=originalTargetAssessment({...q,origin,originTile},map);
 const distance=originalElevationDistance({...q,origin:originTile},map.heightAt);
 const terrainCode=map.terrainAt(originTile.x,originTile.z);
 const launch=originalSelectedLaunch({...q,distance,terrainCode,
  firstWaterIndex:assessment.firstWaterIndex,assessmentSpan:assessment.span,seed:assessment.seed,
  shotClass:map.shotClassAt(terrainCode),targetTerrainCode:map.terrainAt(q.target.x,q.target.z),
  tileFlags:map.marksAt(originTile.x,originTile.z)},cache,
  {kindAt:p=>map.kindAt(map.terrainAt(p.x,p.z)),shotClassAt:map.shotClassAt});
 return {...launch,assessment,distance};
}
