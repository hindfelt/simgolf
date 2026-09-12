import {originalProfileVoice} from './original-profile-voice.js';
import {originalAffectionateAddress} from './original-affectionate-address.js';
import {originalActorName} from './original-actor-name.js';
import {originalLocationDescription} from './original-location-description.js';
import {ORIGINAL_FIXED_PHRASES as fixed,ORIGINAL_STANDARD_PHRASE_STRINGS as labels} from './original-standard-phrase-data.js';
// Standard dispatch starts at 0x469380. Unrecovered cases fail explicitly;
// they must never silently become generic phrases in the fidelity engine.
export function originalStandardPhrase(q,resolve){
 let state=structuredClone(q.state);const kind=q.kind|0,events=[];
 const append=a=>{state.sourceText=state.sourceText.split('\0',1)[0]+labels['0x'+a.toString(16)];};
 const call=(address,args)=>{const event={address,args};events.push(event);if(address===0x466e30){state=originalAffectionateAddress({actorId:args[0],state});return;}if(typeof resolve!=='function')throw Error('Original standard phrase helper requires a resolver.');const reply=resolve(structuredClone(event),structuredClone(state));if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative phrase state.');state=structuredClone(reply);};
 if(typeof state.sourceText!=='string')throw Error('Original standard phrase requires a text buffer.');
 state.remarkStyle=0x80006318;
 if(((kind-1)>>>0)>64||kind===64)return {state,events,next:'postprocess'};
 const record=fixed[kind];let addresses=[];
 if(record){addresses=record.addresses;state.remarkStyle=record.style;}
 else if(kind===2){const a=actor(q),type=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xae,true);
  if(type===4){append(0x4e276c);call(0x466e30,[q.actorId]);append(0x4c3e10);state.redirected=true;}
  else if(type===2){append(0x4e2764);call(0x466fb0,[q.actorId,0]);append(0x4e2754);state.redirected=true;}
  else append(0x4e2784);
  state.remarkStyle=0x80007d08;
 }
 else if(kind===4){const a=actor(q),type=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xae,true);
  if(type===4){append(0x4e2a38);call(0x466fb0,[q.actorId,0]);state.redirected=true;}else append(0x4e2a18);
  state.remarkStyle=0x80007d08;
 }
 else if(kind===26){const a=actor(q),view=new DataView(a.buffer,a.byteOffset,a.byteLength),type=view.getInt16(0xae,true);
  if(type&1){append(0x4e1e20);if(type===1)call(0x466e30,[q.actorId]);else call(0x466fb0,[view.getInt16(0xa2,true),1]);append(0x4c38f4);state.redirected=true;}
  else append(0x4e1e04);
 }
 else if(kind===39){events.push({address:0x46c140,args:[q.actorId]});addresses=[originalProfileVoice({...q,state})?0x4e2048:0x4e2020];state.remarkStyle=0x800023e8;}
 else if(kind===51||kind===52||kind===53){
  if(!Number.isInteger(q.originalClock))throw Error('Original phrase clock is unavailable.');
  const data={51:['drivingRange',[0x4e1d00,0x4e1d1c,0x4e1d3c],0x4e1ce4],52:['proShop',[0x4e1c00,0x4e1c18,0x4e1c34],0x4e1be0],53:['puttingGreen',[0x4e1c88,0x4e1ca4,0x4e1cc4],0x4e1c6c]}[kind];
  if(((q.originalClock|0)+Math.imul(q.actorId,5))&8){const level=q.facilityLevels?.[data[0]];if(!Number.isInteger(level))throw Error('Original facility level is unavailable.');if((level|0)>=1&&(level|0)<=3)addresses=[data[1][(level|0)-1]];}
  else addresses=[data[2]];
 }
 else if(kind===31)addresses=[[0x4e29ac,0x4e2a00,0x4e29c8,0x4e29e0][actor(q)[0xb6]&3]];
 else if(kind===34){const value=q.value|0;if(value>=0&&value<=2)addresses=[[0x4e21ec,0x4e2208,0x4e2224][value]];state.remarkStyle=0x800023e8;}
 else if(kind===40){const a=actor(q),profile=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xb6,true),variant=profile%8;
  if(variant>=0)append([0x4e2110,0x4e2104,0x4e20fc,0x4e20f0,0x4e20e4,0x4e20d8,0x4e20cc,0x4e20c0][variant]);
  if((q.value|0)>0){append(0x4c3924);call(0x4074d0,[0,0,q.value|0]);append(0x4c496c);}
 }
 else if(kind===42){append(0x4e20b0);call(0x466fb0,[q.actorId,0]);state.redirected=true;}
 else if(kind===44){append(0x4e209c);call(0x4074d0,[0,0,q.value|0]);append(0x4c496c);state.remarkStyle=0x800023e8;}
 else if(kind===36){addresses=[(q.value|0)!==0?0x4e2138:0x4e211c];state.remarkStyle=0x80007d08;}
 else if(kind===41)addresses=[(q.actorId&1)?0x4e2080:0x4e206c];
 else if(kind===47){addresses=[actor(q)[0xb6]&1?0x4e2a74:0x4e2a58];state.remarkStyle=0x800023e8;}
 else if(kind===63){const staff=(actor(q)[0x18]&0xe0)===0x20;addresses=[(staff?[0x4e2bf4,0x4e2bcc,0x4e2ba8,0x4e2b84]:[0x4e2b60,0x4e2b30,0x4e2afc,0x4e2ad0])[q.actorId&3]];}
 else if(kind===65){if(!Number.isInteger(q.originalMode))throw Error('Original standard phrase mode is unavailable.');addresses=[0x4e2864];if((q.originalMode|0)>1)state.remarkStyle=0x80007d08;}
 else throw Error(`Original standard phrase case ${kind} is not reconstructed yet.`);
 for(const address of addresses)append(address);
 return {state,events,next:'postprocess'};
}
function actor(q){const value=q.state.actors?.[q.actorId];if(!(value instanceof Uint8Array)||value.length!==256)throw Error('Original standard phrase actor is unavailable.');return value;}

export function originalDescribedStandardPhrase(q,names,locationContext){
 return originalStandardPhrase(q,(event,state)=>{
  if(event.address===0x466fb0){state.sourceText=originalActorName({...names,actorId:event.args[0],actor:state.actors[event.args[0]],sourceText:state.sourceText,appendComma:event.args[1]!==0});return state;}
  const context=locationContext(structuredClone(state)),[c,r,type]=event.args;
  return originalLocationDescription({...context,c,r,type,state},context.map).state;
 });
}
