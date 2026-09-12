// Read-only skill-card data from 0x45e9c0, used by first-hole aiming.
// These ten bytes cross the 256-byte actor boundary at indices eight and nine.
const labels=['Power Hitter','Long Driver','Accurate Driver','Accurate Irons','Accurate Putter','Draw Shot (R to L)','Fade Shot (L to R)','High Backspin Shot','Recovery Skills','Luck'];
export function originalGolferCard(state,{actorId,portraitId,x,title}){
 if(!Number.isInteger(actorId)||actorId< -1||actorId>=152||!Number.isInteger(portraitId)||!Number.isInteger(x)||typeof title!=='string')throw Error('Invalid original golfer card.');
 const record=slot=>{const b=state.actors?.[slot];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original golfer card actor unavailable.');return b;};
 const b=actorId===-1?null:record(actorId);
 const personal=b&&new DataView(b.buffer,b.byteOffset,b.byteLength).getUint16(0xbe,true)!==0;
 let values;
 if(personal){
  const tail=actorId<151?record(actorId+1):state.actorTableTail;
  if(!(tail instanceof Uint8Array)||tail.length<2)throw Error('Original golfer card actor tail unavailable.');
  values=[...b.slice(0xf8),tail[0],tail[1]];
 }else{
  if(!(state.defaultSkills instanceof Uint8Array)||state.defaultSkills.length<10)throw Error('Original golfer card default skills unavailable.');
  values=Array.from(state.defaultSkills.slice(0,10));
 }
 return {actorId,portraitId,x,title:title.split('\0',1)[0],skills:values.map((value,index)=>({label:labels[index],value,percent:value*10,active:value!==0}))};
}

export function originalTutorialGolferCard(event,state){
 if(event?.address!==0x45e9c0||!Array.isArray(event.args)||event.args.length!==5||event.args[0]!==0x518f78||event.args[2]!==-1)throw Error('Unsupported original tutorial card event.');
 const [,portraitId,,actorId,x]=event.args;
 return originalGolferCard(state,{actorId,portraitId,x,title:state.sourceText});
}
