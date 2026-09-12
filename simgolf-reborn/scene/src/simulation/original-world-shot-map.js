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
 return {...map,planning:{...planning,...map.planning}};
}
