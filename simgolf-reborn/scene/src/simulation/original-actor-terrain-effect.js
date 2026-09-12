import {originalWorldShotMap} from './original-world-shot-map.js';

// Original height/slope queries from the same serializable map revision as
// the actor state. Other effects remain the caller's responsibility.
export function originalActorTerrainEffect(event,state){
 if(![0x40c140,0x42f110].includes(event.address))throw Error('Unsupported original terrain effect.');
 const map=originalWorldShotMap(state);
 const [x,z,direction]=event.args;
 return {state,value:event.address===0x40c140?map.slopeAt({x,z},direction):map.heightAt({x,z})};
}
