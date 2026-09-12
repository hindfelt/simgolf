import {applyOriginalPlannerActor} from './original-planner-actor.js';
const int=n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;
const uint=n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
// Commit automatic planner globals and the pre-planner hole's counter alongside
// packed actor outputs. Stack-only assessment locals stay on the result.
export function applyOriginalPlannerResult(snapshot,result,id=snapshot.actorId,hole=snapshot.actors?.[id]?.[0x29]){
 const r=result.state,cache=r?.cache;
 if(!r||!uint(r.seed)||!uint(r.diagnostics)||!int(r.holeCounter)||!int(r.landing?.x)||!int(r.landing?.z)||!cache||!Number.isInteger(cache.next)||cache.next<0||cache.next>=10||!Array.isArray(cache.entries)||cache.entries.length!==10||!cache.entries.every(e=>[e.distance,e.verticalSpeed,e.speed].every(int)))throw Error('Original planner shared outputs unavailable.');
 const state=applyOriginalPlannerActor(snapshot,r,id),record=state.holes?.[hole];
 if(!(record instanceof Uint8Array)||record.length!==520||!Array.isArray(state.metadata))throw Error('Original planner hole/metadata backing unavailable.');
 new DataView(record.buffer,record.byteOffset,record.byteLength).setInt32(0x24,r.holeCounter,true);
 state.seed=r.seed;state.strengthCache=structuredClone(cache);state.diagnostics=r.diagnostics;state.landing={...r.landing};
 if(!Array.isArray(result.shotClassOverrides))throw Error('Original planner restoration writes unavailable.');
 for(const {code,shotClass} of result.shotClassOverrides){
  if(!Number.isInteger(code)||!state.metadata[code]||!Number.isInteger(shotClass)||shotClass< -128||shotClass>127)throw Error('Invalid original planner metadata write.');
  state.metadata[code]={...state.metadata[code],shotClass,scatterCoefficient:shotClass};
 }
 if(result.searched){
  const {result:searchResult,search,shared}=result.searched;
  if(!uint(searchResult?.worldFlags)||!int(searchResult.mode)||!int(searchResult.candidateSkillMask)||!int(searchResult.cornerTarget)||!int(search?.searchFlag)||!int(shared?.landing?.x)||!int(shared?.landing?.z))throw Error('Original search publication unavailable.');
  state.globalFlags=searchResult.worldFlags;state.worldFlags=searchResult.worldFlags;
  state.updateScratch=1; // 0x4224a9: search consumes the current world update.
  state.driftMode=searchResult.mode;state.candidateSkillMask=searchResult.candidateSkillMask;
  state.cornerTarget=searchResult.cornerTarget;state.searchFlag=search.searchFlag;
  state.candidateLanding={...shared.landing};
 }
 return state;
}
