import {originalPhysicsHeight,originalPhysicsSlope} from './original-physics-terrain.js';
// Adapter for original map data. Readers remain live so course edits are not
// hidden behind a stale terrain snapshot. Raw edge storage is caller-owned.
export function createOriginalMotionTerrain({readCell,readCornerHeight,readVertexHeight,globalFlags}) {
 if(![readCell,readCornerHeight,readVertexHeight].every(f=>typeof f==='function')||
  !Number.isInteger(globalFlags)||globalFlags<0||globalFlags>0xffffffff)throw Error('Original terrain readers and flags required.');
 const cellAt=(x,z)=>{
  const cell=readCell(x,z);
  if(!cell||!Number.isInteger(cell.metadataFlags))throw Error('Original cell metadata flags required.');
  return cell;
 };
 const sample=(x,z)=>{
  const cell=cellAt(x>>10,z>>10);
  return {x,z,metadataFlags:cell.metadataFlags,terrainCode:cell.code,globalFlags,
   cornerHeight:readCornerHeight,vertexHeight:readVertexHeight};
 };
 return {cellAt,heightAt:(x,z)=>originalPhysicsHeight(sample(x,z)),
  slopeAt:(x,z,direction)=>originalPhysicsSlope(sample(x,z),direction)};
}
