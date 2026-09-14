import {originalJobMap} from './original-search-job.js';
import {originalAutomaticPlanner} from './original-automatic-planner.js';

class EffectRequired extends Error {
 constructor(request){super('Original reaction effect required.');this.request=request;}
}
// Serializable computation boundary. Replays always start from the immutable
// input snapshot. No default reaction implementation is silently substituted.
export function originalAutomaticJob({request,map:input,physical,searchState,score,spatialScores,records,effectReplies=[]}) {
 const map=originalJobMap(input);
 const read=(table,key,label)=>{
  if(!table||!Object.hasOwn(table,key))throw Error(`Missing original ${label} at ${key}.`);
  return table[key];
 };
 map.planning={...map.planning,
  categoryAt:code=>read(read(input.metadata,code,'terrain metadata'),'category','terrain category'),
  baseSizeAt:type=>read(records?.baseSizes,type,'object size'),
  expansionAt:type=>read(records?.expansions,type,'object expansion'),
  objectAt:index=>read(records?.objects,index,'object record'),
  holeRecordAt:hole=>read(records?.holes,hole,'hole record'),
  profileHoleMarkAt:(profile,hole)=>read(records?.profileHoleMarks,`${profile}:${hole}`,'profile hole mark'),
  profileIndexFor:actor=>read(records?.profileIndices,actor,'profile index'),
  profileByteAt:index=>read(records?.profileBytes,index,'profile byte')};
 let index=0;
 const effects={emit:(event,state)=>{
  const reply=effectReplies[index];
  if(!reply)throw new EffectRequired({index,event:structuredClone(event),state:structuredClone(state)});
  if(reply.event?.actorId!==event.actorId||reply.event?.kind!==event.kind||reply.event?.value!==event.value)
   throw Error(`Original reaction reply ${index} does not match replay.`);
  if(!reply.state||typeof reply.state!=='object')throw Error(`Missing original reaction state at ${index}.`);
  index++;
  return structuredClone(reply.state);
 }};
 try {
  const result=originalAutomaticPlanner(request,{map,physical,searchState,score,
   scoreAt:(x,z)=>read(spatialScores,x*50+z,'spatial score')},effects);
  if(index!==effectReplies.length)throw Error('Unused original reaction replies.');
  return {status:'done',result};
 }catch(error){
  if(error instanceof EffectRequired)return {status:'effect',...error.request};
  throw error;
 }
}
