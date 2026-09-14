import {ORIGINAL_EXPLANATION_OPERATIONS as operations} from './original-explanation-text-data.js';
const ctext=s=>{if(typeof s!=='string')throw Error('Original explanation substitution is unavailable.');return s.split('\0',1)[0];};
// Original0x4681dc–0x468feb. Prefix quotation/name has already been assembled.
export function originalExplanationText(q,resolve){
 let state=structuredClone(q.state);const events=[],ops=operations[q.kind|0]||[];
 if(!ops.length){state.sourceText='';return {state,events};}
 for(const [type,text] of ops){
  if(type==='text'||type==='pronoun'||type==='term'||type==='object'){
   const value=type==='text'?text:type==='pronoun'?q.pronoun:type==='term'?q.terms?.[q.value|0]?.name:q.objectNames?.[q.value|0];state.sourceText=ctext(state.sourceText)+ctext(value);continue;
  }
  const value=q.value|0,event=type==='name'?{address:0x466fb0,args:[q.actorId|0,0]}:{address:0x4074d0,args:[(value%50)|0,Math.trunc(value/50)|0,-1]};events.push(event);
  if(typeof resolve!=='function')throw Error('Original explanation helper requires a resolver.');
  const reply=resolve(structuredClone(event),structuredClone(state));if(!reply||typeof reply.then==='function')throw Error('Expected synchronous original explanation state.');state=structuredClone(reply);
 }
 return {state,events};
}
