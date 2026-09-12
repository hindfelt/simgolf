import {originalGolferLoop} from './original-golfer-loop.js';
import {originalActorTerrainEffect} from './original-actor-terrain-effect.js';
export function originalGolferTerrainLoop(snapshot,resolve,resolveSpecial){
 return originalGolferLoop(snapshot,(event,state)=>{
  if([0x40c140,0x42f110].includes(event.address))return originalActorTerrainEffect(event,state);
  if(typeof resolve!=='function')throw Error('Original golfer effect requires an explicit resolver.');
  return resolve(event,state);
 },resolveSpecial);
}
