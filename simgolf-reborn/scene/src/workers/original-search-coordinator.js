import {originalSearchClient} from './original-search-client.js';
// revision() must identify all authoritative inputs: course, golfer/ball and
// shared RNG/cache. apply() commits the complete result synchronously.
export function originalSearchCoordinator({revision,apply,client=originalSearchClient()}) {
 let generation=0,disposed=false;
 const cancel=()=>{generation++;client.cancel();};
 const plan=async(snapshot,expectedRevision)=>{
  if(disposed)throw Error('Search coordinator has been disposed.');
  const ownGeneration=++generation;
  client.cancel();
  if(revision()!==expectedRevision)return {status:'stale'};
  let answer;
  try{answer=await client.run(snapshot,expectedRevision);}
  catch(error){
   if(error?.name==='AbortError')return {status:'cancelled'};
   throw error;
  }
  if(disposed||ownGeneration!==generation)return {status:'cancelled'};
  if(answer.revision!==expectedRevision||revision()!==expectedRevision)return {status:'stale'};
  // No await between checking authoritative state and committing its result.
  apply(answer.result);
  return {status:'applied'};
 };
 return {plan,cancel,dispose:()=>{disposed=true;generation++;client.dispose();}};
}
