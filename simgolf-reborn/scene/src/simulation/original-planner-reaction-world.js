import {applyOriginalPlannerActor,originalPlannerActor} from './original-planner-actor.js';
const uint=n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
function records(state,id,holeId){
 const actor=state.actors?.[id],hole=state.holes?.[holeId];
 if(!(actor instanceof Uint8Array)||actor.length!==256||!(hole instanceof Uint8Array)||hole.length!==520)throw Error('Original planner reaction records unavailable.');
 const a=new DataView(actor.buffer,actor.byteOffset,actor.byteLength),partner=state.actors?.[a.getInt16(0xaa,true)];
 if(!(partner instanceof Uint8Array)||partner.length!==256)throw Error('Original planner reaction partner unavailable.');
 return {a,h:new DataView(hole.buffer,hole.byteOffset,hole.byteLength),partner};
}
// holeId is captured at planner entry; reactions may subsequently change the
// actor's current hole, but the planner's counter still addresses that record.
export function originalPlannerReactionWorld(snapshot,partial,id,holeId){
 if(!uint(partial.seed)||!uint(partial.diagnostics)||!Number.isInteger(partial.holeCounter)||partial.holeCounter< -0x80000000||partial.holeCounter>0x7fffffff)throw Error('Original planner reaction globals unavailable.');
 const state=applyOriginalPlannerActor(snapshot,partial,id),{h,partner}=records(state,id,holeId);
 for(const [key,off] of [['actorClass',0x20],['reaction',0x8c]]){
  const n=partial.partner?.[key];if(!Number.isInteger(n)||n<0||n>255)throw Error('Original planner reaction partner field unavailable.');partner[off]=n;
 }
 h.setInt32(0x24,partial.holeCounter,true);if(state.holeRecords)state.holeRecords=state.holes;
 state.seed=partial.seed;state.diagnostics=partial.diagnostics;state.strengthCache=structuredClone(partial.cache);
 return state;
}
export function originalPlannerAfterReaction(partial,world,id,holeId){
 const {a,h,partner}=records(world,id,holeId);
 return {...structuredClone(partial),actor:originalPlannerActor(world,id),partner:{actorClass:partner[0x20],reaction:partner[0x8c]},seed:world.seed,diagnostics:world.diagnostics,cache:structuredClone(world.strengthCache),holeCounter:h.getInt32(0x24,true),speed:a.getInt32(0xec,true),verticalSpeed:a.getInt32(0xf0,true),heading:a.getUint32(0xe8,true)};
}
