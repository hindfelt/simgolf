import {originalLocationDescription} from './original-location-description.js';
import {originalActorName} from './original-actor-name.js';
const ctext=value=>{if(typeof value!=='string')throw Error('Original phrase substitution data is unavailable.');return value.split('\0',1)[0];};
const replaceFirst=(source,token,value)=>{const i=source.indexOf(token);return i<0?source:source.slice(0,i)+value+source.slice(i+token.length);};
// 0x46bc7e–0x46bf36. Replacement is first-occurrence, in MYNAME/PARTNER/DATA
// order. A later marker may occur inside an earlier replacement.
export function originalPhrasePostprocess(q,expandName,describeLocation){
 let state=structuredClone(q.state);const events=[];if((q.value|0)===-1)return {state,events};
 const source=ctext(state.sourceText),names=[];
 for(const id of [q.actorId,q.actorId^1]){
  state.sourceText='';const event={address:0x466fb0,args:[id,0]};events.push(event);
  if(typeof expandName!=='function')throw Error('Original phrase actor naming requires a resolver.');const reply=expandName(structuredClone(event),structuredClone(state));
  if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative name state.');state=structuredClone(reply);names.push(ctext(state.sourceText));
 }
 state.sourceText=q.actorId>152?'DATA(':'';const kind=q.kind|0,value=q.value|0;
 if([11,20,28].includes(kind)){
  const event={address:0x4074d0,args:[(value%50)|0,Math.trunc(value/50)|0,-1]};events.push(event);
  if(typeof describeLocation!=='function')throw Error('Original location description requires a resolver.');const reply=describeLocation(structuredClone(event),structuredClone(state));
  if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative location state.');state=structuredClone(reply);
 }else if(kind===39)state.sourceText+=ctext(q.labels[value]);
 else{
  const term=q.terms[value];if(!term)throw Error('Original terrain description is unavailable.');
  if(kind===2||kind===3)state.sourceText+=(term.type===13?'under the ':'in the ')+ctext(term.name);
  else state.sourceText+=ctext(kind!==12&&term.type===13?term.alternate:term.name);
 }
 if(q.actorId>152)state.sourceText+=')';const data=ctext(state.sourceText);
 state.sourceText=replaceFirst(replaceFirst(replaceFirst(source,'MYNAME',names[0]),'PARTNER',names[1]),'DATA',data);
 return {state,events};
}
export function originalNamedPhrasePostprocess(q,names,describeLocation){
 return originalPhrasePostprocess(q,(event,state)=>{state.sourceText=originalActorName({...names,actorId:event.args[0],actor:state.actors[event.args[0]],sourceText:state.sourceText,appendComma:false});return state;},describeLocation);
}

export function originalDescribedPhrasePostprocess(q,names,locationContext,describeBuilding){
 const locationEvents=[];
 const result=originalNamedPhrasePostprocess(q,names,(event,state)=>{
  const context=locationContext(structuredClone(state));const [c,r,type]=event.args;
  const description=originalLocationDescription({...context,c,r,type,state},context.map,describeBuilding);locationEvents.push(...description.events);return description.state;
 });
 return {...result,locationEvents};
}
