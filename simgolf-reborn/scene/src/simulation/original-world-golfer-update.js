import {originalWorldMotion} from './original-world-motion.js';
import {originalWorldUpdate,originalWorldAfterGolfers} from './original-world-update.js';
import {originalGolferTerrainLoop,resumeOriginalGolferTerrainLoop} from './original-golfer-terrain-loop.js';

function worldResolver(resolveWorld,soundEvents,presentationEvents){return (address,state)=>{
 if(address===0x409980&&state.motionRecords!==undefined)return originalWorldMotion(state).state;
 if(typeof resolveWorld!=='function')throw Error('Original world systems require an explicit resolver.');
 const reply=resolveWorld(address,state);
 if(!reply||typeof reply.then==='function'||!reply.state)throw Error('Original world systems require synchronous state.');
 if(reply.soundEvents!==undefined){
  if(!Array.isArray(reply.soundEvents))throw Error('Original world sounds require an event array.');
  soundEvents.push(...structuredClone(reply.soundEvents));
 }
 if(reply.presentationEvents!==undefined){
  if(!Array.isArray(reply.presentationEvents))throw Error('Original world presentation requires an event array.');
  presentationEvents.push(...structuredClone(reply.presentationEvents));
 }
 return reply.state;
};}
// An incomplete result deliberately has no publishable state or sound batch.
const pending=golfer=>({completed:false,skipped:false,calls:[0x428100],soundEvents:[],presentationEvents:[],continuation:golfer});
const accepted=(result,golfer,soundEvents,presentationEvents)=>({...result,completed:true,soundEvents,presentationEvents,golfer:golfer?{calls:golfer.calls,randomDraws:golfer.randomDraws}:null});
// Save/broadcast/play only after completed === true. Effects are speculative.
export function originalWorldGolferUpdate(snapshot,{resolve,resolveSpecial,plannerFor,resolveWorld}={}){
 const soundEvents=[],presentationEvents=[],suspend={};let golfer;
 const rest=worldResolver(resolveWorld,soundEvents,presentationEvents);
 try{
  const result=originalWorldUpdate(snapshot,(address,state)=>{
   if(address!==0x428100)return rest(address,state);
   golfer=originalGolferTerrainLoop(state,resolve,resolveSpecial,plannerFor);
   if(!golfer.completed)throw suspend;
   soundEvents.push(...golfer.soundEvents);presentationEvents.push(...golfer.presentationEvents);return golfer.state;
  });
  return accepted(result,golfer,soundEvents,presentationEvents);
 }catch(error){if(error===suspend)return pending(golfer);throw error;}
}
export function resumeOriginalWorldGolferUpdate(suspended,{resumeTurn,resolve,resolveSpecial,plannerFor,resolveWorld}={}){
 if(suspended?.completed!==false||!suspended.continuation)throw Error('Original suspended world update unavailable.');
 const golfer=resumeOriginalGolferTerrainLoop(suspended.continuation,resumeTurn,resolve,resolveSpecial,plannerFor);
 if(!golfer.completed)return pending(golfer);
 const sounds=[...golfer.soundEvents],presentation=[...golfer.presentationEvents],result=originalWorldAfterGolfers(golfer.state,worldResolver(resolveWorld,sounds,presentation));
 result.calls.unshift(0x428100);
 return accepted(result,golfer,sounds,presentation);
}
