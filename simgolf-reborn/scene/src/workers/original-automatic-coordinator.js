import {originalAutomaticClient} from './original-automatic-client.js';

function reactionResult(work,signal){
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(new DOMException('Automatic reaction cancelled.','AbortError'));
  const finish=(callback,value)=>{signal.removeEventListener('abort',abort);callback(value);};
  if(signal.aborted){abort();Promise.resolve(work).catch(()=>{});return;}
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(work).then(value=>finish(resolve,value),error=>finish(reject,error));
 });
}

// revision() identifies course, actor/ball, social state and shared RNG/cache.
// resolveEffect must operate on its supplied speculative state, never commit
// live changes. apply() commits only the complete result synchronously.
export function originalAutomaticCoordinator({revision,resolveEffect,apply,client=originalAutomaticClient()}) {
 if(typeof resolveEffect!=='function')throw Error('Automatic planning requires a reaction resolver.');
 let generation=0,disposed=false,active=null;
 const cancel=()=>{generation++;active?.abort();active=null;client.cancel();};
 const plan=async(snapshot,expectedRevision)=>{
  if(disposed)throw Error('Automatic coordinator has been disposed.');
  cancel();
  const ownGeneration=generation,controller=new AbortController();active=controller;
  const status=()=>disposed||ownGeneration!==generation?'cancelled':revision()!==expectedRevision?'stale':null;
  try{
   if(status())return {status:status()};
   if(snapshot.effectReplies?.length)throw Error('Start a fresh automatic plan without reaction replies.');
   const input=structuredClone({...snapshot,effectReplies:[]});
   while(true){
    const answer=await client.run(input,expectedRevision);
    const stopped=status();if(stopped)return {status:stopped};
    if(answer.revision!==expectedRevision)return {status:'stale'};
    const result=answer.result;
    if(result?.status==='done'){
     if(!result.result||typeof result.result!=='object')throw Error('Missing completed automatic result.');
     // No await between the revision check and the complete atomic commit.
     apply(result.result);
     return {status:'applied'};
    }
    if(result?.status!=='effect'||result.index!==input.effectReplies.length)
     throw Error('Unexpected automatic reaction response.');
    const event=structuredClone(result.event);
    const state=await reactionResult(resolveEffect(structuredClone(result),{revision:expectedRevision,signal:controller.signal}),controller.signal);
    const afterEffect=status();if(afterEffect)return {status:afterEffect};
    if(!state||typeof state!=='object')throw Error('Reaction resolver must return speculative state.');
    input.effectReplies.push({event,state:structuredClone(state)});
   }
  }catch(error){
   const stopped=status();if(stopped)return {status:stopped};
   if(error?.name==='AbortError')return {status:'cancelled'};
   throw error;
  }finally{
   if(active===controller)active=null;
  }
 };
 return {plan,cancel,dispose:()=>{cancel();disposed=true;client.dispose();}};
}
