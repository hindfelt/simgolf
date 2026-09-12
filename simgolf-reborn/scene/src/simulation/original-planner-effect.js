import {originalShotPreparation} from './original-shot-preparation.js';
import {originalPlannerInput} from './original-planner-input.js';
import {originalAutomaticPlanner} from './original-automatic-planner.js';
import {applyOriginalPlannerResult} from './original-planner-result.js';

// Resolver for the scheduler's 0x4235c0 automatic-target planner call. Map,
// search scratch and reaction dependencies must belong to this snapshot.
export function originalPlannerEffect(event,snapshot,context,dependencies,effects){
 const args=event?.args;
 if(event?.address!==0x4235c0||!Array.isArray(args)||args.length!==5||!args.every(Number.isInteger)||args[0]!==snapshot.actorId||![0,1].includes(args[1])||args[2]!==-1)throw Error('Expected original automatic-target planner call.');
 const input=originalPlannerInput(snapshot,context);
 Object.assign(input.planning,{plannerArgument:args[2],explicitTarget:!!args[1],targetZ:args[3],curve:args[4]});
 const planner=originalAutomaticPlanner(input,dependencies,effects);
 return {state:applyOriginalPlannerResult(snapshot,planner),planner};
}

// Continuous shot preparation, including the post-planner facing/stance writes.
export function originalPlannedShotPreparation(snapshot,context,dependencies,effects){
 let planner;
 const prepared=originalShotPreparation(snapshot,(event,state)=>{
  const reply=originalPlannerEffect(event,state,context,dependencies,effects);
  planner=reply.planner;return reply;
 });
 return {...prepared,planner};
}
