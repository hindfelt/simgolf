import {createOriginalMotionTerrain} from './original-motion-terrain.js';
import {originalCornerHeight} from './original-corner-height.js';
import {originalPhysicsHeight,originalPhysicsSlope} from './original-physics-terrain.js';
// Shared original map access for launch planning and candidate physics.
// derived must come from the same map revision; rebuilding it is caller-owned.
export function originalShotMap({terrain,marks,derived,readHeight,metadata,globalFlags,readRawTerrain}) {
 if(!(terrain instanceof Uint8Array)||terrain.length!==2500||!(marks instanceof Uint16Array)||marks.length!==2500||
 !(derived?.edgeMasks instanceof Uint8Array)||derived.edgeMasks.length!==2500||
 !(derived.surfaceHeights instanceof Int8Array)||derived.surfaceHeights.length!==2500||
 !(derived.directionHeights instanceof Int8Array)||derived.directionHeights.length!==20000||
 typeof readHeight!=='function'||typeof metadata!=='function'||!Number.isInteger(globalFlags))throw Error('Invalid original shot map.');
 const index=({x,z})=>{
  if(!Number.isInteger(x)||!Number.isInteger(z))throw Error('Original shot map requires integer tile coordinates.');
  return x<0||x>=50||z<0||z>=50?-1:x*50+z;
 };
 const terrainAt=p=>{
  const i=index(p),code=i<0?20:terrain[i],m=metadata(code);
  return {code,flags:i<0?0:marks[i],wallFlags:i<0?0:derived.edgeMasks[i],
   bounceCoefficient:m.bounceCoefficient,rollCoefficient:m.rollCoefficient,
   metadataFlags:m.flags,kind:m.kind,shotClass:m.shotClass};
 };
 // The original assessment side ray reads a flattened address without bounds
 // checking. Preserve aliases within the array; reads beyond its backing data
 // need explicit original memory data rather than an invented terrain value.
 const rawTerrainAt=(x,z)=>{
  if(!Number.isInteger(x)||!Number.isInteger(z))throw Error('Original shot map requires integer tile coordinates.');
  const i=(Math.imul(x,50)+z)|0;
  if(i>=0&&i<2500)return terrain[i];
  if(typeof readRawTerrain!=='function')throw Error('Original side ray requires terrain data beyond the map array.');
  const code=readRawTerrain(i);
  if(!Number.isInteger(code)||code<0||code>127)throw Error('Invalid original raw terrain code.');
  return code;
 };
 const planning={terrainAt:rawTerrainAt,kindAt:code=>metadata(code).kind,
  shotClassAt:code=>metadata(code).shotClass,heightAt:readHeight,
  marksAt:(x,z)=>{const i=index({x,z});return i<0?0:marks[i];}};
 const cornerHeight=(row,column,direction)=>originalCornerHeight({row,column,direction,useCache:true,readHeight,
  readMetadataFlags:(r,c)=>metadata(terrain[r*50+c]).flags,
  readSurfaceHeight:(r,c)=>derived.surfaceHeights[r*50+c],
  readCachedHeight:(r,c,d)=>derived.directionHeights[(r*50+c)*8+d]});
 const sample=p=>{const t=terrainAt({x:p.x>>10,z:p.z>>10});return {...p,terrainCode:t.code,metadataFlags:t.metadataFlags,globalFlags,cornerHeight,vertexHeight:readHeight};};
 const motion=createOriginalMotionTerrain({globalFlags,readCornerHeight:cornerHeight,readVertexHeight:readHeight,
  readNeighborTerrain:rawTerrainAt,
  readCell:(x,z)=>{
   if(index({x,z})<0)throw Error('Original motion outside map requires outer shot handling.');
   const cell=terrainAt({x,z});
   return {...cell,edgeFlags:cell.wallFlags,scatterCoefficient:cell.shotClass};
  },
 });
 return {motion,planning,terrainAt,kindAt:p=>terrainAt(p).kind,shotClassAt:code=>metadata(code).shotClass,
  heightAt:p=>originalPhysicsHeight(sample(p)),slopeAt:(p,d)=>originalPhysicsSlope(sample(p),d)};
}
