import {originalPlannerWorldRecords} from './original-planner-world-records.js';
import {originalShotMap} from './original-shot-map.js';
import {createOriginalStoredHeight} from './original-stored-height.js';

// Bind planning and motion to one current packed world revision. Rebuild this
// binding after map edits; derived heights/edges remain caller-owned state.
// Social/object readers and unchecked reads beyond terrain are explicit.
export function originalWorldShotMap(state,{planning={},readRawTerrain}={}){
 if(!Number.isInteger(state.phaseCounter)||state.phaseCounter<1||state.phaseCounter>0xffffffff)throw Error('Original generated-height phase requires its generator.');
 const readHeight=createOriginalStoredHeight({terrain:state.terrain,heights:state.heights,originalFlags:state.globalFlags});
 const map=originalShotMap({terrain:state.terrain,marks:state.tileFlags,derived:state.derived,readHeight,metadata:code=>state.metadata[code],globalFlags:state.globalFlags,readRawTerrain});
 // Extra object/social callbacks cannot replace authoritative terrain readers.
 return {...map,planning:{...planning,...originalPlannerWorldRecords(state),...map.planning}};
}

// Stable callbacks for a planner whose reactions replace its world snapshot.
// Build each read from one snapshot, keeping nested physics sampling internally
// consistent. Do not cache by revision: native reactions can alter packed data
// without advancing the browser's revision counter. Optional readGeneration
// must advance on EVERY publication by the owner (including option changes);
// omit it for arbitrary readers whose mutations cannot be tracked.
export function originalCurrentWorldShotMap(readWorld,optionsFor=()=>({}),readGeneration){
 if(typeof readWorld!=='function'||typeof optionsFor!=='function')throw Error('Original current-world map requires synchronous readers.');
 if(readGeneration!==undefined&&typeof readGeneration!=='function')throw Error('Original map generation reader unavailable.');
 let cached,previousGeneration;
 const current=()=>{
  const generation=readGeneration?.();
  if(readGeneration&&(!Number.isSafeInteger(generation)||generation<0))throw Error('Original map generation must be a nonnegative integer.');
  if(readGeneration&&cached&&generation===previousGeneration)return cached;
  const state=readWorld();
  if(!state||typeof state.then==='function')throw Error('Original current-world snapshot must be synchronous.');
  const options=optionsFor(state);
  if(!options||typeof options.then==='function')throw Error('Original current-world map options must be synchronous.');
  const map=originalWorldShotMap(state,options);
  if(readGeneration){cached=map;previousGeneration=generation;}
  return map;
 };
 const initial=current();
 const bind=(sample,path=[])=>Object.fromEntries(Object.entries(sample).map(([key,value])=>{
  const keys=[...path,key];
  if(typeof value==='function')return [key,(...args)=>{
   const map=current();let target=map;
   for(const part of keys)target=target[part];
   if(typeof target!=='function')throw Error('Original current-world map reader unavailable.');
   return target(...args);
  }];
  if(value&&typeof value==='object')return [key,bind(value,keys)];
  throw Error('Original current-world map options must contain callable readers.');
 }));
 return bind(initial);
}
