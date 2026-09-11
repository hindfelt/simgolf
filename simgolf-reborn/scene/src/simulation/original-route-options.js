import {originalRouteOption} from './original-route-option.js';
import {originalRouteBatch} from './original-route-batch.js';
// One admitted candidate, 0x422af8–0x42323d. Option order is center then corner,
// each draw/straight/fade. Callback state therefore flows through all options.
export function originalRouteOptions(q,simulate) {
 const scores=[...q.scores],distances=[...q.distances],flags=[...q.flags];
 let work=q.work,winner=structuredClone(q.winner),searchFlag=q.searchFlag,followupFlag=q.followupFlag;
 for(let cornerTarget=0;cornerTarget<2;cornerTarget++){
  if(cornerTarget&&q.originClass>0)continue;
  for(let curve=-1;curve<=1;curve++){
   const i=cornerTarget*3+curve+1;
   const gate=originalRouteOption({score:scores[i],curve,curveMask:q.shapeMask,distance:q.distance});
   scores[i]=gate.score;if(!gate.eligible)continue;
   const result=originalRouteBatch({...q,cornerTarget,curve,score:scores[i],work,winner,searchFlag,followupFlag},simulate);
   scores[i]=result.score;distances[i]=result.plannedRemaining;flags[i]=result.sampleFlags;
   ({work,winner,searchFlag,followupFlag}=result);
  }
 }
 return {scores,distances,flags,work,winner,searchFlag,followupFlag};
}
