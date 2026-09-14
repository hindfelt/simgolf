import {originalRestArrival} from './original-rest-arrival.js';
import {originalRestAdjacency} from './original-rest-adjacency.js';
export function originalRestVisit(snapshot,resolve){
 return originalRestArrival(snapshot,(event,state)=>event.address===0x4071d0
  ?{state,value:originalRestAdjacency(state,...event.args)}:resolve(event,state));
}
