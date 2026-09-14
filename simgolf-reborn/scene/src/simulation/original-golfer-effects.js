import {originalActorTerrainEffect} from './original-actor-terrain-effect.js';
import {originalPlannerEffect} from './original-planner-effect.js';

// Resolve against the current actor's world, after earlier slots have run.
// Bindings are synchronous: map readers and search scratch must describe that
// same revision. Animation cadence and presentation remain outside this layer.
export function originalGolferEffects(resolve,plannerFor){
 const soundEvents=[],presentationEvents=[];
 const capture=reply=>{
  if(reply?.soundEvents!==undefined){
   if(!Array.isArray(reply.soundEvents))throw Error('Original golfer sound events must be synchronous.');
   soundEvents.push(...structuredClone(reply.soundEvents));
  }
  if(reply?.presentationEvents!==undefined){
   if(!Array.isArray(reply.presentationEvents))throw Error('Original golfer presentation must be an event array.');
   presentationEvents.push(...structuredClone(reply.presentationEvents));
  }
  return reply;
 };
 const dispatch=(event,state)=>{
  if([0x40c140,0x42f110].includes(event.address))return originalActorTerrainEffect(event,state);
  if(event.address===0x4235c0&&plannerFor!==undefined){
   if(typeof plannerFor!=='function')throw Error('Original planner binding must be synchronous.');
   const binding=plannerFor(structuredClone(event),structuredClone(state));
   if(!binding||typeof binding.then==='function'||!binding.context||!binding.dependencies)throw Error('Original planner binding unavailable.');
   return capture(originalPlannerEffect(event,state,binding.context,binding.dependencies,binding.effects));
  }
  if(typeof resolve!=='function')throw Error('Original golfer effect requires an explicit resolver.');
  return capture(resolve(event,state));
 };
 // Presentation is transient: draining never changes the simulated world.
 dispatch.drainSoundEvents=()=>soundEvents.splice(0);
 dispatch.drainPresentationEvents=()=>presentationEvents.splice(0);
 return dispatch;
}
