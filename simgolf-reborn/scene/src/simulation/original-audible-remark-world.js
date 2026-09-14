import {originalAudibleCompleteRemark} from './original-audible-complete-remark.js';
import {originalRemarkWorldSnapshot,originalApplyCompleteRemarkWorld} from './original-remark-world.js';
// Run a complete remark against a packed world. Outcome counters are sampled
// after speech/preamble; scalar reaction fields never replace map arrays.
export function originalAudibleRemarkWorld(q,options={}){
 let world=structuredClone(q.state),snapshot=null,kind=q.kind;
 const result=originalAudibleCompleteRemark({...q,state:world},{
  ...options,
  reactionContext:(state,currentKind)=>{
   world=structuredClone(state);kind=currentKind;
   return originalRemarkWorldSnapshot(world,q.actorId,kind).context;
  },
  readOutcome:state=>{
   world.actors[q.actorId]=state.actor.slice();
   for(const key of ['seed','worldDirty','queued','sequenceIndex'])if(Object.hasOwn(state,key))world[key]=structuredClone(state[key]);
   snapshot=originalRemarkWorldSnapshot(world,q.actorId,kind);
   return snapshot.context;
  },
  explanationContext:r=>({state:r.state,difficulty:world.difficulty})
 });
 return {...result,state:originalApplyCompleteRemarkWorld(world,snapshot,result)};
}
