import {originalPlannerReactionWorld,originalPlannerAfterReaction} from './original-planner-reaction-world.js';
import {originalAudibleGolferRemark} from './original-audible-golfer-remark.js';
import {applyOriginalPlannerResult} from './original-planner-result.js';

// A planner invocation owns this world until completion. Readers that can change
// during reactions must use readWorld(), rather than a captured older snapshot.
export function originalAudiblePlannerEffects(snapshot,remarkFor){
 const id=snapshot.actorId,holeId=snapshot.actors?.[id]?.[0x29];
 let world=structuredClone(snapshot),generation=0;
 return {
  readWorld:()=>structuredClone(world),
  readGeneration:()=>generation,
  emit:(event,partial)=>{
   const published=originalPlannerReactionWorld(world,partial,id,holeId);
   if(typeof remarkFor!=='function')throw Error('Original audible planner remark binding unavailable.');
   const binding=remarkFor(structuredClone(event),structuredClone(published));
   if(!binding?.request||typeof binding.then==='function')throw Error('Original audible planner remark binding must be synchronous.');
   const result=originalAudibleGolferRemark({...binding.request,state:published,actorId:event.actorId,kind:event.kind,value:event.value,globalFlags:published.globalFlags},binding.options);
   const next=originalPlannerAfterReaction(partial,result.state,id,holeId);
   world=result.state;generation++;
   return next;
  },
  complete:result=>applyOriginalPlannerResult(world,result,id,holeId),
 };
}
