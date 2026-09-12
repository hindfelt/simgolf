import {originalShotPreparation} from './original-shot-preparation.js';
// 0x42b647–0x42b6f8: presentation before first-hole manual aiming.
// UI/name helpers remain explicit, synchronous speculative effects.
export function originalAimingTutorial(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;
 if(!Number.isInteger(id)||id<0||id>=152)throw Error('Original aiming tutorial actor unavailable.');
 function profile(slot){const b=state.actors?.[slot];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Original aiming tutorial profile unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength).getInt16(0x1e,true);}
 function call(address,args,thisArg){
  if(typeof resolve!=='function')throw Error('Original aiming tutorial requires UI effects.');
  const event={address,args,...(thisArg===undefined?{}:{thisArg})};calls.push(event);
  const reply=resolve(structuredClone(event),structuredClone(state));
  if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original tutorial state.');state=structuredClone(reply.state);
 }
 call(0x447a30,[42,100,0,0,0]);
 const partner=id^1;
 state.sourceText='';call(0x466fb0,[partner,0]);
 if(typeof state.sourceText!=='string')throw Error('Original tutorial name unavailable.');
 state.sourceText=state.sourceText.split('\0',1)[0]+' vs...';
 call(0x45e9c0,[0x518f78,profile(partner),-1,partner,0]);
 state.sourceText='';call(0x466fb0,[id,0]);
 call(0x45e9c0,[0x518f78,profile(id),-1,id,350]);
 call(0x4803e0,[0],0x518970);call(0x45b990,[0]);
 return {state,calls,next:'0x42b6f8'};
}

// For resumeOriginalGolferTerrainLoop: execute the pending UI sequence, then
// resume preparation at its post-tutorial entry without repeating the prefix.
export function resumeOriginalAimingTurn(suspended,resolve){
 if(suspended?.next!=='0x42b647')throw Error('Unsupported original aiming continuation.');
 const tutorial=originalAimingTutorial(suspended.state,resolve);
 const prepared=originalShotPreparation(tutorial.state,resolve,tutorial.next);
 return {...prepared,calls:[...tutorial.calls,...prepared.calls]};
}
