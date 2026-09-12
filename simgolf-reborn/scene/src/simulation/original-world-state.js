import {originalStrengthCache} from './original-strength-search.js';
import {originalDerivedMap} from './original-derived-map.js';
import {createOriginalStoredHeight} from './original-stored-height.js';
import {originalShotMap} from './original-shot-map.js';

export const ORIGINAL_WORLD_FORMAT='fairway-baron.original-world';
const uint=n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
const int=n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;
const byte=n=>Number.isInteger(n)&&n>=0&&n<=255;
const signedByte=n=>Number.isInteger(n)&&n>=-128&&n<=127;
function vector(value,length,valid,name) {
 if(!Array.isArray(value)||value.length!==length||!value.every(valid))throw Error(`Invalid original world ${name}.`);
}
function validate(world) {
 if(world?.format!==ORIGINAL_WORLD_FORMAT||world.version!==1)throw Error('Unsupported world format; legacy courses require explicit conversion.');
 const g=world.geometry;
 if(g?.width!==50||g.height!==50||g.yardsPerCell!==25||g.unitsPerCell!==1024)throw Error('Original world geometry cannot be rescaled.');
 if(![world.rngState,world.phaseCounter,world.revision,world.globalFlags].every(uint))throw Error('Invalid original world counters.');
 if(!Array.isArray(world.metadata)||world.metadata.length<23||world.metadata.length>128||!world.metadata.every(m=>m&&uint(m.flags)&&byte(m.shape)&&[m.bounceCoefficient,m.rollCoefficient,m.shotClass,m.kind].every(signedByte)))throw Error('Invalid original runtime terrain metadata.');
 vector(world.terrain,2500,n=>Number.isInteger(n)&&n>=0&&n<world.metadata.length,'terrain');
 vector(world.marks,2500,n=>Number.isInteger(n)&&n>=0&&n<=65535,'marks');
 vector(world.ownership,2500,byte,'ownership');vector(world.heights,2601,byte,'heights');
 const cache=world.strengthCache;
 if(!cache||!Number.isInteger(cache.next)||cache.next<0||cache.next>=10||!Array.isArray(cache.entries)||cache.entries.length!==10||
  !cache.entries.every(e=>e&&[e.distance,e.verticalSpeed,e.speed].every(int)))throw Error('Invalid original strength cache.');
 if(!Array.isArray(world.shots)||world.shots.length>152)throw Error('Invalid original active shots.');
 const ids=new Set();
 for(const shot of world.shots) {
  if(!shot||typeof shot.id!=='string'||!shot.id.length||shot.id.length>80||ids.has(shot.id))throw Error('Invalid or duplicate shot identity.');ids.add(shot.id);
  const b=shot.ball;
  if(!b||![b.x,b.z,b.height,b.speed,b.verticalSpeed,b.angularOffset].every(int)||!uint(b.heading)||!uint(b.seed)||
   !uint(shot.stateFlags)||!signedByte(shot.originTerrainCode)||!byte(shot.club)||typeof shot.eventFlag!=='boolean'||
   ![0,1].includes(shot.centreFlag)||typeof shot.skillEnabled!=='boolean'||!Number.isInteger(shot.skillMask)||shot.skillMask<0||shot.skillMask>65535||
   !byte(shot.luck)||!signedByte(shot.variant)||![shot.targetTile?.x,shot.targetTile?.z].every(n=>Number.isInteger(n)&&n>=0&&n<50))throw Error('Invalid original saved shot.');
 }
 return world;
}
export function createOriginalWorld({terrain,marks,ownership,heights,metadata,rngState,phaseCounter,globalFlags}) {
 return validate({format:ORIGINAL_WORLD_FORMAT,version:1,geometry:{width:50,height:50,yardsPerCell:25,unitsPerCell:1024},
  terrain:Array.from(terrain),marks:Array.from(marks),ownership:Array.from(ownership),heights:Array.from(heights),
  metadata:metadata.map(({flags,bounceCoefficient,rollCoefficient,shotClass,kind,shape})=>({flags,bounceCoefficient,rollCoefficient,shotClass,kind,shape})),
  rngState,phaseCounter,globalFlags,revision:0,strengthCache:originalStrengthCache(),shots:[]});
}
export function serializeOriginalWorld(world) {return JSON.stringify(validate(world));}
export function restoreOriginalWorld(json) {
 if(typeof json!=='string'||json.length>2000000)throw Error('Original world save is too large or invalid.');
 return validate(JSON.parse(json));
}
// Rebuild from the saved source data; callers refresh this after map edits.
// Runtime metadata and the shared strength cache are preserved independently.
function buildWorldMap(world) {
 validate(world);
 const terrain=Uint8Array.from(world.terrain),heights=Uint8Array.from(world.heights),metadata=code=>world.metadata[code];
 const readHeight=createOriginalStoredHeight({terrain,heights,originalFlags:world.globalFlags});
 const derived=originalDerivedMap({terrain,ownership:Uint8Array.from(world.ownership),readHeight,metadata,originalFlags:world.globalFlags});
 const marks=Uint16Array.from(world.marks);
 const map=originalShotMap({terrain,marks,derived,readHeight,metadata,globalFlags:world.globalFlags});
 return {map,terrain,heights,marks,derived};
}

export function originalWorldMap(world){return buildWorldMap(world).map;}
// Original-format terrain for the actor engine; actor/career records remain
// caller-owned. Metadata byte 2 has both names in the recovered subsystems.
export function originalWorldActorMap(world){
 const {map,terrain,heights,marks,derived}=buildWorldMap(world);
 return {map,terrain,heights,derived,tileFlags:marks,edgeMasks:derived.edgeMasks,
  metadata:world.metadata.map(m=>({...m,scatterCoefficient:m.shotClass})),
  seed:world.rngState,phaseCounter:world.phaseCounter,worldFlags:world.globalFlags,
  globalFlags:world.globalFlags};
}
