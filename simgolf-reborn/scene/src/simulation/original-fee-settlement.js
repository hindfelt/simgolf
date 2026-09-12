import {originalActorName} from './original-actor-name.js';
import {originalExplanationPopup} from './original-explanation-popup.js';
import {originalFeePosting} from './original-fee-posting.js';
// Original 0x426c92–0x426e6b: suppression, first-fee tutorial, then posting.
export function originalFeeSettlement(q){
 let state=structuredClone(q.state);const events=[];let popupRandomDraws=0;
 if(q.globalFlags&0x200000)return {state,events,popupRandomDraws,posted:false};
 if(!Number.isInteger(state.feeLedgerIndex)||(state.feeLedgerIndex===0&&!Number.isInteger(state.feeLedger?.[0])))throw Error('Original fee settlement ledger is unavailable.');
 if(state.feeLedgerIndex===0&&state.feeLedger[0]===0){
  state.feeMessageActor=(q.actorId|0x100)|0;
  events.push({address:0x466fb0,args:[q.actorId,0]});
  state.sourceText=originalActorName({...q.names,actorId:q.actorId,actor:state.actors[q.actorId],sourceText:'',appendComma:false});
  state.sourceText+=' has just paid you your first greens fee of '+Math.imul(state.feeUnits,100)+' simoleans!  Golfers pay a fee at the end of each hole - happy golfers pay higher fees, unhappy golfers pay less. Greens fees are your main source of revenue, so it pays to keep your golfers happy. Refer to your financial report for more detailed information.';
  state.feeTutorialStage=3;
  events.push({address:0x40c7f0,args:[1,1,q.actorId]});
  const popup=originalExplanationPopup({state,style:1,priority:1,actorId:q.actorId,difficulty:q.difficulty});state=popup.state;popupRandomDraws=popup.randomDraws;
 }
 const posted=originalFeePosting({...q,state});events.push(...posted.events);
 return {state:posted.state,events,popupRandomDraws,posted:true};
}
