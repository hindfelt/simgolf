import {originalWorldUpdate} from './original-world-update.js';
import {originalGolferTerrainLoop} from './original-golfer-terrain-loop.js';

// Callbacks are synchronous and speculative. Save/broadcast/play sounds only
// after this entire boundary returns; remaining world systems are explicit.
export function originalWorldGolferUpdate(snapshot,{resolve,resolveSpecial,plannerFor,resolveWorld}={}){
 const soundEvents=[];let golfer;
 const result=originalWorldUpdate(snapshot,(address,state)=>{
  if(address===0x428100){
   golfer=originalGolferTerrainLoop(state,resolve,resolveSpecial,plannerFor);
   if(!golfer.completed)throw Error(`Original world tick has an unfinished golfer turn: actor ${golfer.state.actorId}, ${golfer.next}.`);
   soundEvents.push(...golfer.soundEvents);return golfer.state;
  }
  if(typeof resolveWorld!=='function')throw Error('Original world systems require an explicit resolver.');
  const reply=resolveWorld(address,state);
  if(!reply||typeof reply.then==='function'||!reply.state)throw Error('Original world systems require synchronous state.');
  if(reply.soundEvents!==undefined){
   if(!Array.isArray(reply.soundEvents))throw Error('Original world sounds require an event array.');
   soundEvents.push(...structuredClone(reply.soundEvents));
  }
  return reply.state;
 });
 return {...result,soundEvents,golfer:golfer?{calls:golfer.calls,randomDraws:golfer.randomDraws}:null};
}
