import {originalSelectedPhrase} from './original-phrase-entry.js';
import {originalPhrasePostprocess} from './original-phrase-postprocess.js';
// Entire phrase flow: personal override or standard dispatch, then substitutions.
// Shared helper state is threaded in original call order, including resource cache.
export function originalCompletePhrase(q,resolve,readResource){
 const selected=originalSelectedPhrase(q,resolve,readResource);
 const completed=originalPhrasePostprocess({...q,holeIndex:selected.hole,state:selected.state},resolve,resolve);
 return {state:completed.state,hole:selected.hole,events:[...(selected.events||[]),...completed.events]};
}
