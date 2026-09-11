import {originalShotMap} from './original-shot-map.js';
import {originalDirectionalHeightStage} from './original-corner-height.js';
import {originalPhysicalRouteSearch} from './original-physical-candidates.js';
// Serializable boundary shared by local workers and future authoritative hosts.
export function originalSearchJob({search,launch,physical,shared,map:input}) {
 if(input.vertices?.length!==2601||!Array.from(input.vertices).every(n=>Number.isInteger(n)&&n>=-128&&n<=127))
  throw Error('Original search requires a 51 by 51 vertex-height snapshot.');
 const terrain=Uint8Array.from(input.terrain),marks=Uint16Array.from(input.marks);
 const readHeight=(r,c)=>input.vertices[r*51+c];
 const metadata=code=>{
  const value=input.metadata[code];
  if(!value)throw Error(`Missing original terrain metadata for code ${code}.`);
  return value;
 };
 const derived=input.derived?{
  edgeMasks:Uint8Array.from(input.derived.edgeMasks),
  surfaceHeights:Int8Array.from(input.derived.surfaceHeights),
  directionHeights:Int8Array.from(input.derived.directionHeights),
 }:{...originalDirectionalHeightStage({readHeight,readMetadataFlags:(r,c)=>metadata(terrain[r*50+c]).flags}),
  edgeMasks:Uint8Array.from(input.edgeMasks)};
 const map=originalShotMap({terrain,marks,derived,readHeight,metadata,globalFlags:input.globalFlags,
  readRawTerrain:index=>{
   if(!Object.hasOwn(input.rawTerrain??{},index))throw Error(`Missing original raw terrain at ${index}.`);
   return input.rawTerrain[index];
  }});
 return originalPhysicalRouteSearch(search,{launch,physical,shared,map});
}
