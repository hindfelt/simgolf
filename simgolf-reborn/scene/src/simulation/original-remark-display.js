const signedByte=n=>(n<<24)>>24;
const text=value=>{if(typeof value!=='string')throw Error('Original remark display requires text buffers.');return value.split('\0',1)[0];};
// Complete 0x406b20 display-priority and message-prefix helper. Name expansion
// (0x466fb0) remains an explicit speculative-state dependency.
export function originalRemarkDisplay(q,expandName){
 let state=structuredClone(q.state);const events=[];
 if((q.priority|0)<signedByte(state.priority))return {state,events};
 state.priority=q.priority&255;
 if(q.actorId===-1){state.displayText=text(state.sourceText);return {state,events};}
 const saved=text(state.sourceText);state.sourceText='';
 if(typeof expandName!=='function')throw Error('Original actor name expansion requires a resolver.');
 const event={address:0x466fb0,args:[q.actorId|0,0]};events.push(event);
 const reply=expandName(structuredClone(event),structuredClone(state));
 if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative name state.');state=structuredClone(reply);
 const actor=state.actors[q.actorId];if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original remark display requires a packed actor record.');
 state.displayText=`${text(state.sourceText)} (${signedByte(actor[0x21])}): ${saved}`;state.sourceText=saved;
 return {state,events};
}
