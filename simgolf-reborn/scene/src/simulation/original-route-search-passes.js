import {originalRoutePass} from './original-route-pass.js';
import {originalRoutePrunedState} from './original-route-spread.js';
import {originalRouteDiagnostics} from './original-route-finish.js';
// 0x422799–0x4234eb: repeated grid passes and pruning, before final publication.
export function originalRouteSearchPasses(q,simulate) {
 let state={scores:q.scores,distances:q.distances,flags:q.flags,work:q.work,winner:q.winner,
  searchFlag:q.searchFlag,followupFlag:q.followupFlag};
 let samples=q.samples,diagnostics=q.diagnostics;
 const passes=[];
 for(;;){
  passes.push(samples);
  state=originalRoutePass({...q,...state,samples,winner:{...state.winner,score:99999},
   distances:Array.from({length:441},()=>Array(6).fill(0))},simulate);
  if(samples>=8||q.mode===2)break;
  const pruned=originalRoutePrunedState({...q,...state,bestScore:state.winner.score,samples});
  diagnostics=originalRouteDiagnostics({samples,diagnostics,...pruned.spread});
  state={...state,scores:pruned.scores};samples=pruned.nextSamples;
  if(!pruned.continueSearch)break;
 }
 return {...state,samples,diagnostics,passes};
}
