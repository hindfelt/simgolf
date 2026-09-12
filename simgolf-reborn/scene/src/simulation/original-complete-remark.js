import {originalReactedRemark} from './original-reacted-remark.js';
import {originalPopupCompleteExplanation} from './original-complete-explanation.js';

// The explanation snapshot supplies current globals after reaction effects.
// It must not run effects or consume randomness. Packed world counters remain
// in reaction.state for the world writer, rather than overwriting world arrays.
export function originalCompleteRemark(q,{resolvePhrase,readResource,playSpeech,reactionContext,resolveEffect,readOutcome,explanationContext}={}){
 const reacted=originalReactedRemark(q,resolvePhrase,readResource,playSpeech,reactionContext,resolveEffect,readOutcome);
 if(reacted.next==='return')return {...reacted,explanation:null};
 if(typeof explanationContext!=='function')throw Error('Original explanation world snapshot is unavailable.');
 const fresh=explanationContext(structuredClone(reacted));
 if(!fresh?.state||typeof fresh.then==='function'||!Number.isInteger(fresh.difficulty))throw Error('Expected synchronous original explanation world snapshot and difficulty.');
 const state={...structuredClone(reacted.state),...structuredClone(fresh.state),seed:reacted.reaction.state.seed};
 state.actors[q.actorId]=structuredClone(reacted.reaction.state.actor);
 const explanation=originalPopupCompleteExplanation({...q,difficulty:fresh.difficulty,kind:reacted.kind,selectedDelta:reacted.reaction.selectedDelta,state},resolvePhrase,readResource);
 return {...reacted,state:explanation.state,explanation};
}
