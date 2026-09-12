import {originalWorldGolferUpdate,resumeOriginalWorldGolferUpdate} from './original-world-golfer-update.js';
import {serializeOriginalRuntime,restoreOriginalRuntime} from './original-runtime-checkpoint.js';
const FORMAT='fairway-baron.original-session';
// Single owner of committed runtime state. Bindings must perform only
// speculative effects; browser/network publication follows successful commit.
export function createOriginalRuntimeSession(initial,bindings,{ruleset}={}){
 if(typeof ruleset!=='string'||!ruleset.length||ruleset.length>160)throw Error('Explicit original runtime ruleset required.');
 return own({format:FORMAT,version:1,ruleset,revision:0,state:structuredClone(initial),pending:null},bindings);
}
export function restoreOriginalRuntimeSession(text,bindings,{ruleset}={}){
 const saved=restoreOriginalRuntime(text);
 if(saved?.format!==FORMAT||saved.version!==1||typeof ruleset!=='string'||!ruleset.length||ruleset.length>160||saved.ruleset!==ruleset||!Number.isSafeInteger(saved.revision)||saved.revision<0)throw Error('Incompatible original runtime session.');
 return own(saved,bindings);
}
function own(saved,bindings){
 // Reject executable readers; owners reconstruct those from the packed state.
 serializeOriginalRuntime(saved);
 if(!saved.state||!Array.isArray(saved.state.actors)||saved.state.actors.length!==152||saved.state.actors.some(b=>!(b instanceof Uint8Array)||b.length!==256)||
  (saved.pending!==null&&(saved.pending?.completed!==false||!saved.pending.continuation)))throw Error('Invalid original runtime session state.');
 let queue=[];
 function accept(result){
  if(result.completed){
   if(saved.revision>=Number.MAX_SAFE_INTEGER)throw Error('Original runtime revision exhausted.');
   saved.state=result.state;saved.pending=null;saved.revision++;queue.push(...structuredClone(result.soundEvents));
  }else saved.pending=result;
  return {completed:result.completed,revision:saved.revision,...(result.completed?{}:{actorId:result.continuation.state.actorId,next:result.continuation.next})};
 }
 return {
  read:()=>structuredClone(saved.state),
  status:()=>({revision:saved.revision,suspended:saved.pending!==null}),
  step(){if(saved.pending)throw Error('Resume the pending original turn before advancing.');return accept(originalWorldGolferUpdate(saved.state,bindings));},
  resume(){if(!saved.pending)throw Error('No original turn is suspended.');return accept(resumeOriginalWorldGolferUpdate(saved.pending,bindings));},
  // Completed sounds are transient and excluded from saves to avoid replay.
  // Sounds belonging to a pending transaction remain in its checkpoint.
  drainSounds(){const sounds=queue;queue=[];return sounds;},
  checkpoint:()=>serializeOriginalRuntime(saved),
 };
}
