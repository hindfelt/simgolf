import {originalActorName} from './original-actor-name.js';
import {originalLocationDescription} from './original-location-description.js';
import {originalRemarkExplanationGate,originalRemarkExplanationDisplay} from './original-remark-explanation.js';
import {originalCompletePhrase} from './original-complete-phrase.js';
import {originalExplanationText} from './original-explanation-text.js';
// Complete explanation flow through the external popup boundary.
export function originalCompleteExplanation(q,resolve,readResource,showPopup){
 const gate=originalRemarkExplanationGate(q),events=[...gate.events];let state=structuredClone(q.state);
 if(gate.next==='return')return {state,events,phraseEvents:[],pronoun:gate.pronoun};
 const a=state.actors[q.actorId],combined=((a[0x21]<<24)>>24)*11+((a[0x22]<<24)>>24);
 state.sourceText="'";events.push({address:0x469330,args:[q.kind|0,q.value|0,combined,q.actorId|0]});
 const phrase=originalCompletePhrase({...q,combined,state},resolve,readResource);state=phrase.state;
 state.sourceText=state.sourceText.split('\0',1)[0]+"' ";
 const name={address:0x466fb0,args:[q.actorId|0,0]};events.push(name);
 if(typeof resolve!=='function')throw Error('Original explanatory actor name requires a resolver.');
 const reply=resolve(structuredClone(name),structuredClone(state));if(!reply||typeof reply.then==='function')throw Error('Expected synchronous original explanation name state.');state=structuredClone(reply);
 const text=originalExplanationText({...q,pronoun:gate.pronoun,state},resolve);events.push(...text.events);
 const display=originalRemarkExplanationDisplay({...q,state:text.state},showPopup);events.push(...display.events);
 return {state:display.state,events,phraseEvents:phrase.events,pronoun:gate.pronoun};
}

export function originalDescribedCompleteExplanation(q,names,locationContext,readResource,showPopup){
 const locationEvents=[];
 const result=originalCompleteExplanation(q,(event,state)=>{
  if(event.address===0x466fb0){state.sourceText=originalActorName({...names,actorId:event.args[0],actor:state.actors[event.args[0]],sourceText:state.sourceText,appendComma:!!event.args[1]});return state;}
  if(event.address!==0x4074d0)throw Error('Unknown original explanation helper.');
  const context=locationContext(structuredClone(state)),[c,r,type]=event.args;
  const description=originalLocationDescription({...context,c,r,type,state},context.map);locationEvents.push(...description.events);return description.state;
 },readResource,showPopup);
 return {...result,locationEvents};
}
