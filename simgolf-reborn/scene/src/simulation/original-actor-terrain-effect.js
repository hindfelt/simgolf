import {originalShotMap} from './original-shot-map.js';
import {createOriginalStoredHeight} from './original-stored-height.js';

// Original height/slope queries from the same serializable map revision as
// the actor state. Other effects remain the caller's responsibility.
export function originalActorTerrainEffect(event,state){
 if(![0x40c140,0x42f110].includes(event.address))throw Error('Unsupported original terrain effect.');
 if(!Number.isInteger(state.phaseCounter)||state.phaseCounter<1||state.phaseCounter>0xffffffff)throw Error('Original generated-height phase requires its generator.');
 const readHeight=createOriginalStoredHeight({terrain:state.terrain,heights:state.heights,originalFlags:state.globalFlags});
 const map=originalShotMap({terrain:state.terrain,marks:state.tileFlags,derived:state.derived,readHeight,metadata:code=>state.metadata[code],globalFlags:state.globalFlags});
 const [x,z,direction]=event.args;
 return {state,value:event.address===0x40c140?map.slopeAt({x,z},direction):map.heightAt({x,z})};
}
