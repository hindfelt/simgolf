import {originalRemarkPreparation} from './original-remark-preparation.js';
import {originalRecordRemarkEntry} from './original-remark-entry.js';
import {originalCompletePhrase,originalDescribedCompletePhrase} from './original-complete-phrase.js';
import {originalNamedRemarkDisplay} from './original-remark-display.js';
import {originalRemarkDisplay} from './original-remark-display.js';
const signedByte=n=>(n<<24)>>24;
// Original 0x46737d–0x467408: external record processing, receiver selection,
// pending-message fields and per-kind argument storage. Packed actor records
// retain native field aliasing until the live actor schema is mapped.
export function originalRemarkDispatch(q,resolve){
 let state=structuredClone(q.state);const events=[];
 const actor=()=>{const record=state.actors[q.actorId];if(!(record instanceof Uint8Array)||record.length!==256)throw Error('Original dispatch requires a packed actor record.');return record;};
 const combined=signedByte(actor()[0x21])*11+signedByte(actor()[0x22]);
 if(typeof resolve!=='function')throw Error('Original dispatch requires explicit record-processing effects.');
 for(const event of [{address:0x469330,args:[q.kind|0,q.value|0,combined,q.actorId|0]},{address:0x406b20,args:[q.actorId|0,0]}]){
  events.push(structuredClone(event));const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative dispatch state.');state=structuredClone(reply);
 }
 const source=actor(),receiver=state.redirected?new DataView(source.buffer,source.byteOffset,source.byteLength).getInt16(0xa2,true):q.actorId;
 const target=state.actors[receiver];if(!(target instanceof Uint8Array)||target.length!==256)throw Error('Original dispatch receiver is unavailable.');
 target[0x84]=7;target[0x85]=q.kind;target[0x86]=source[0x21]*11+source[0x22];new DataView(target.buffer,target.byteOffset,target.byteLength).setUint16(0x9c,q.value,true);
 if(state.redirected)target[0x85]|=0x80;
 if(!Number.isInteger(q.kind)||q.kind<0||q.kind>=state.requestValues.length)throw Error('Original dispatch request storage is unavailable.');
 state.requestValues[q.kind]=q.value|0;
 return {state,events,receiver};
}

// Resolve the recovered display helper during record dispatch. Phrase processing
// and actor-name expansion remain explicit; their state changes stay ordered.
export function originalDisplayedRemarkDispatch(q,processRecord,expandName){
 const displayEvents=[];
 const result=originalRemarkDispatch(q,(event,state)=>{
  if(event.address===0x469330){if(typeof processRecord!=='function')throw Error('Original phrase processing requires a resolver.');return processRecord(event,state);}
  const display=originalRemarkDisplay({actorId:event.args[0],priority:event.args[1],state},expandName);displayEvents.push(...display.events);return display.state;
 });
 return {...result,displayEvents};
}

// Complete recovered record processing and display, preserving dispatch writes.
export function originalCompleteRemarkDispatch(q,resolve,readResource){
 const phraseEvents=[];
 const result=originalDisplayedRemarkDispatch(q,(event,state)=>{
  const [kind,value,combined,actorId]=event.args;
  const phrase=originalCompletePhrase({...q,kind,value,combined,actorId,state},resolve,readResource);
  phraseEvents.push(...phrase.events);return phrase.state;
 },resolve);
 return {...result,phraseEvents};
}
export function originalDescribedCompleteRemarkDispatch(q,names,locationContext,readResource){
 const phraseEvents=[],displayEvents=[],locationEvents=[];
 const result=originalRemarkDispatch(q,(event,state)=>{
  if(event.address===0x469330){
   const [kind,value,combined,actorId]=event.args;
   const phrase=originalDescribedCompletePhrase({...q,kind,value,combined,actorId,state},names,locationContext,readResource);
   phraseEvents.push(...phrase.events);locationEvents.push(...phrase.locationEvents);return phrase.state;
  }
  const display=originalNamedRemarkDisplay({actorId:event.args[0],priority:event.args[1],state},names);
  displayEvents.push(...display.events);return display.state;
 });
 return {...result,phraseEvents,displayEvents,locationEvents};
}

export function originalEligibleRemarkDispatch(q,resolve,readResource){
 const entry=originalRecordRemarkEntry(q);
 if(!entry.allowed)return {allowed:false,kind:entry.kind,state:structuredClone(q.state),events:[],phraseEvents:[],displayEvents:[],receiver:null};
 return {...originalCompleteRemarkDispatch({...q,kind:entry.kind},resolve,readResource),allowed:true,kind:entry.kind};
}

export function originalPreparedRemarkDispatch(q,resolve,readResource,playSound){
 const dispatched=originalEligibleRemarkDispatch(q,resolve,readResource);
 if(!dispatched.allowed)return {...dispatched,next:'return',before:null,voiceOffset:null,preparationEvents:[]};
 const prepared=originalRemarkPreparation({...q,kind:dispatched.kind,state:dispatched.state},playSound);
 return {...dispatched,state:prepared.state,next:prepared.next,before:prepared.before,voiceOffset:prepared.voiceOffset,preparationEvents:prepared.events};
}
