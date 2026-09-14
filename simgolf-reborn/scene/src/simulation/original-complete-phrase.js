import {originalActorName} from './original-actor-name.js';
import {originalLocationDescription} from './original-location-description.js';
import {originalSelectedPhrase} from './original-phrase-entry.js';
import {originalPhrasePostprocess} from './original-phrase-postprocess.js';
// Entire phrase flow: personal override or standard dispatch, then substitutions.
// Shared helper state is threaded in original call order, including resource cache.
export function originalCompletePhrase(q,resolve,readResource){
 const selected=originalSelectedPhrase(q,resolve,readResource);
 const completed=originalPhrasePostprocess({...q,holeIndex:selected.hole,state:selected.state},resolve,resolve);
 return {state:completed.state,hole:selected.hole,events:[...(selected.events||[]),...completed.events]};
}

// Resolve names from original packed actor records; location remains a snapshot
// provider because terrain can change between successive helper calls.
export function originalDescribedCompletePhrase(q,names,locationContext,readResource){
 const locationEvents=[];
 const result=originalCompletePhrase(q,(event,state)=>{
  if(event.address===0x466fb0){state.sourceText=originalActorName({...names,actorId:event.args[0],actor:state.actors[event.args[0]],sourceText:state.sourceText,appendComma:!!event.args[1]});return state;}
  if(event.address!==0x4074d0)throw Error('Unknown original phrase helper.');
  const context=locationContext(structuredClone(state)),[c,r,type]=event.args;
  const description=originalLocationDescription({...context,c,r,type,state},context.map);
  locationEvents.push(...description.events);return description.state;
 },readResource);
 return {...result,locationEvents};
}
