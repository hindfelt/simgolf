import {originalResourcePhrase} from './original-resource-phrase.js';
import {originalScoreComment} from './original-score-comment.js';
import {originalHoleDescription} from './original-hole-description.js';
import {originalClubName} from './original-club-name.js';
import {originalProfileVoice} from './original-profile-voice.js';
import {originalAffectionateAddress} from './original-affectionate-address.js';
import {originalActorName} from './original-actor-name.js';
import {originalLocationDescription} from './original-location-description.js';
import {ORIGINAL_FIXED_PHRASES as fixed,ORIGINAL_STANDARD_PHRASE_STRINGS as labels} from './original-standard-phrase-data.js';
// All 65 standard request kinds from 0x469380. Resource I/O remains explicit;
// missing original records must never silently become generic phrases.
export function originalStandardPhrase(q,resolve,readResource){
 let state=structuredClone(q.state);const kind=q.kind|0,events=[];
 const append=a=>{state.sourceText=state.sourceText.split('\0',1)[0]+labels['0x'+a.toString(16)];};
 const call=(address,args)=>{const event={address,args};events.push(event);if(address===0x407050){const result=originalHoleDescription({...q,holeIndex:args[0],state});state=result.state;events.push(...result.events);return;}if(address===0x466e30){state=originalAffectionateAddress({actorId:args[0],state});return;}if(typeof resolve!=='function')throw Error('Original standard phrase helper requires a resolver.');const reply=resolve(structuredClone(event),structuredClone(state));if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative phrase state.');state=structuredClone(reply);};
 if(typeof state.sourceText!=='string')throw Error('Original standard phrase requires a text buffer.');
 state.remarkStyle=0x80006318;
 if(((kind-1)>>>0)>64||kind===64)return {state,events,next:'postprocess'};
 const record=fixed[kind];let addresses=[];
 if(record){addresses=record.addresses;state.remarkStyle=record.style;}
 else if(kind===50){
  const a=actor(q),view=new DataView(a.buffer,a.byteOffset,a.byteLength),fileId=view.getInt16(0xb0,true),value=q.value|0,section=value&15,variant=value>>4,mode=(view.getUint32(0x10,true)>>>20)&1;
  state.sourceText='';events.push({address:0x466440,args:[fileId,section,variant,mode]});
  const result=originalResourcePhrase({...q,fileId,section,variant,mode,state},readResource);state=result.state;events.push(...result.events);
 }
 else if(kind===19||kind===23){
  const a=actor(q),h=q.holeIndex;if(!Number.isInteger(h)||h<0||h+0x23>=256)throw Error('Original score hole index is unavailable.');
  const current=q.holeRecords?.[h],following=q.holeRecords?.[h+1];if(!(current instanceof Uint8Array)||current.length!==520||!(following instanceof Uint8Array)||following.length!==520)throw Error('Original score hole records are unavailable.');
  const stroke=(a[0x23+h]<<24)>>24,par=(current[8]<<24)>>24,d=stroke-par,flags=new DataView(following.buffer,following.byteOffset,following.byteLength).getUint32(0,true);
  append(d>=-4&&d<=3?[0x4e1bac,0x4e1b9c,0x4e1b94,0x4e1b88,0x4e1b80,0x4e1b78,0x4e1b68,0x4e1b58][d+4]:0x4e1b50);
  if((flags&4)&&(d>1||q.actorId===152)){append(0x4e1b38);state.remarkStyle=0x80007d08;}
  else if((flags&8)&&(d<0||q.actorId===152)){append(0x4e1b20);state.remarkStyle=0x80007d08;}
  else if(kind===23){append(0x4e1b04);state.remarkStyle=0x80007d08;}
  else{const v=(q.actorId+h)&3,mask=v<3&&(a[0x19]&(1<<v))?(0x100<<v):0;
   if((mask&flags)&&d<=0)append({256:0x4e1a98,512:0x4e1abc,1024:0x4e1adc}[mask]);
   else{const view=new DataView(a.buffer,a.byteOffset,a.byteLength),type=view.getInt16(0xae,true);let partnerScore=0;if(type===2||type===4)partnerScore=(actor({...q,actorId:view.getInt16(0xa2,true),state})[0x23+h]<<24)>>24;
    if(partnerScore)append(stroke<partnerScore?0x4e1a84:0x4e1a64);
    else{events.push({address:0x469250,args:[q.value|0,d]});state=originalScoreComment({value:q.value,relativeScore:d,state});}
   }
  }
 }
 else if(kind===1){const a=actor(q);
  if(a[0xae]&1){append(0x4d2914);const partner=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xa2,true),other=actor({...q,actorId:partner,state});const odd=other[0xb6]&1;events.push({address:0x46c140,args:[partner]});const voice=originalProfileVoice({...q,actorId:partner,state});append(odd?(voice?0x4e2838:0x4e2850):(voice?0x4e2800:0x4e2820));state.redirected=true;}
  else{const v=a[0xb6]&3;if(v===3)append(0x4e27ec);else if(v===1)append(0x4e27d8);else if(v===0&&q.actorId!==-1){append(0x4e27bc);append(0x4e27b0);}else append(0x4e2794);}
  state.remarkStyle=0x800023e8;
 }
 else if(kind===61){const v=q.value|0;const pair={3:[0x4e23f0,0x4e23f8],4:[0x4e23b4,0x4e23d8],5:[0x4e2384,0x4e2390],6:[0x4e235c,0x4e233c],7:[0x4e2310,0x4e2324]}[v]||[0x4e22e8,0x4e22f8];append(pair[q.actorId&1]);}
 else if(kind===59){
  const a=actor(q),profile=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xb6,true),h=q.holeIndex;
  if(!Number.isInteger(h)||h<0||19+h>=44)throw Error('Original history hole index is unavailable.');
  const history=q.profileHistory?.[profile];if(!(history instanceof Uint8Array)||history.length!==44)throw Error('Original golfer hole history is unavailable.');
  if(history[h]){append(0x4e22c8);state.remarkStyle=0x800023e8;}
  else{const next=q.holeRecords?.[h+1];if(!(next instanceof Uint8Array)||next.length!==520)throw Error('Original history hole record is unavailable.');
   if(next[0]&1){if(next[0]&2)append(0x4e22a4);else{append(0x4e2298);call(0x466fb0,[q.actorId^1,0]);append(0x4c4244);if(actor({...q,state})[0xb6]&1){call(0x407050,[h]);append(0x4e2284);}else{append(0x4e226c);call(0x407050,[h]);append(0x4c38f4);}}}
   else{append(0x4e2260);const score=(history[19+h]<<24)>>24;events.push({address:0x4acb95,args:[score,0x836454,10]});state.sourceText+=String(score);append(0x4e2244);}
  }
 }
 else if(kind===54){if(!Number.isInteger(q.originalMode))throw Error('Original phrase mode is unavailable.');append(0x4e1c5c);events.push({address:0x40a6c0,args:[q.value|0]});state=originalClubName({clubId:q.value,state});append(0x4e1c4c);if((q.originalMode|0)<=1)state.remarkStyle=0x800023e8;}
 else if(kind===7){state.sourceText='';if((q.value|0)===0){append(actor(q)[0x12]&1?0x4e1ff8:0x4e1fd0);state.remarkStyle=0x800023e8;}else append(0x4e1fa8);}
 else if(kind===58){const value=q.value|0;if(value>=0&&value<=2)append([0x4e2414,0x4e2438,0x4e244c][value]);}
 else if(kind===30){
  if(!Number.isInteger(q.holeIndex))throw Error('Original phrase hole index is unavailable.');
  const record=index=>{const r=q.holeRecords?.[index];if(!(r instanceof Uint8Array)||r.length!==520)throw Error('Original phrase hole record is unavailable.');return r;};
  const next=record(q.holeIndex+1)[0];
  if((next&32)&&(record(q.holeIndex)[0]&32))append(0x4e24c4);
  else if((next&64)&&(record(q.holeIndex)[0]&64))append(0x4e24a8);
  else{const par=record(q.holeIndex)[8];if(par===record(q.holeIndex-1)[8]){append(0x4e2490);const signed=(par<<24)>>24;events.push({address:0x4acb95,args:[signed,0x836454,10]});state.sourceText+=String(signed);append(0x4c38f4);}else append(0x4e246c);}
  state.remarkStyle=0x80007d08;
 }
 else if(kind===3){const a=actor(q),type=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xae,true);
  if(type===2){append(0x4e26d0);append(0x4c2f20);call(0x466fb0,[q.actorId,0]);append(0x4c38f4);state.redirected=true;}
  else if(type===3){append(0x4e2700);call(0x466fb0,[q.actorId,0]);append(0x4e26ec);state.redirected=true;}
  else if(type===4){append(0x4e2704);state.redirected=true;}
  else{append([0x4e274c,0x4e2744,0x4e273c,0x4e2734][a[0xb6]&3]);append(0x4e2724);}
  state.remarkStyle=0x80007d08;
 }
 else if(kind===11){const a=actor(q),view=new DataView(a.buffer,a.byteOffset,a.byteLength),type=view.getInt16(0xae,true);
  append(type===1?0x4e1f04:0x4e1f14);append((q.value&0x100)?0x4e1efc:0x4e1ef0);append(0x4e28f4);
  if(type===1)call(0x466e30,[view.getInt16(0xa2,true)]);else append(0x4c3e10);
  state.remarkStyle=0x800023e8;
 }
 else if(kind===28){const a=actor(q),view=new DataView(a.buffer,a.byteOffset,a.byteLength),type=view.getInt16(0xae,true);
  if(type===1||type===3||type===5){append(0x4e1f24);const partner=view.getInt16(0xa2,true);if(type===1)call(0x466e30,[partner]);else call(0x466fb0,[partner,1]);append(0x4c38f4);}
  else{events.push({address:0x46c140,args:[q.actorId]});const voice=originalProfileVoice({...q,state});append(voice?(a[0xb6]&1?0x4e1f8c:0x4e1f74):(a[0xb6]&1?0x4e1f5c:0x4e1f40));}
  state.remarkStyle=0x800023e8;
 }
 else if(kind===10||kind===60){
  const term=q.terms?.[q.value|0];if(!term)throw Error('Original terrain phrase data is unavailable.');
  if(kind===10){const name=ctext(term.name);if(!name&&!Number.isInteger(term.precedingByte))throw Error('Empty original terrain name requires its preceding byte.');append(0x4e2654);append((name?name.charCodeAt(name.length-1):term.precedingByte&255)===115?0x4e2644:0x4e264c);state.sourceText+=name;append(0x4c4b98);state.remarkStyle=0x80007d08;}
  else{if(!Number.isInteger(term.type))throw Error('Original terrain category is unavailable.');append(0x4e2510);if((term.type&255)===13){append(0x4e2504);state.sourceText+=ctext(term.name);}append(0x4c38f4);}
 }
 else if(kind===22){append(0x4e25ac);state.sourceText+=ctext(q.objectNames?.[q.value|0]);append(0x4e25a0);state.remarkStyle=0x800023e8;}
 else if(kind===5||kind===37||kind===38){
  const a=actor(q),type=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xae,true);
  if(type===0||type===4){append({5:0x4e28fc,37:0x4e2920,38:0x4e2940}[kind]);append(0x4e28f4);}
  else if(type===1){append(0x4e28c8);call(0x466e30,[q.actorId]);state.redirected=true;}
  else if(type===2){if(q.actorId&1)append(0x4e28ac);else{append(0x4e2894);append(0x4e288c);}append(0x4c2f20);call(0x466fb0,[q.actorId,0]);state.redirected=true;}
  else if(type===3||type===5){append(0x4e28dc);call(0x466fb0,[q.actorId,1]);state.redirected=true;}
  append(0x4c38f4);
 }
 else if(kind===13){const a=actor(q),view=new DataView(a.buffer,a.byteOffset,a.byteLength),type=view.getInt16(0xae,true);
  if(type===2||type===4){append(0x4e1e74);call(0x466fb0,[q.actorId,0]);append(0x4c4b98);state.redirected=true;}
  else{const variant=view.getInt16(0xb6,true)%3;if(variant>=0)append([0x4e1e8c,0x4e1ea0,0x4e1ebc][variant]);}
  state.remarkStyle=0x80007d08;
 }
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
 else if(kind===49||kind===62){
  const a=actor(q),id=new DataView(a.buffer,a.byteOffset,a.byteLength).getInt16(0xb6,true),profile=q.profileRecords?.[id];
  if(!(profile instanceof Uint8Array)||profile.length!==560)throw Error('Original phrase profile is unavailable.');
  if(kind===49){append(0x4e1bbc);const end=profile.indexOf(0);if(end<0)throw Error('Original profile name lacks a terminator.');state.sourceText+=String.fromCharCode(...profile.subarray(0,end));append(0x4c38f4);}
  else{events.push({address:0x46c140,args:[q.actorId]});const index=((profile[0x22]<<24)>>24)+(originalProfileVoice({...q,state})?0:20),phrase=q.profileRemarks?.[index];if(typeof phrase!=='string')throw Error('Original profile remark table is unavailable.');state.sourceText=state.sourceText.split('\0',1)[0]+phrase.split('\0',1)[0];}
 }
 else if(kind===35){if(!Number.isInteger(q.originalClock))throw Error('Original phrase clock is unavailable.');const sum=((q.originalClock|0)+Math.imul(q.actorId,45))|0;addresses=[[0x4e21c8,0x4e2198,0x4e2174,0x4e2150][Math.trunc(sum/80)&3]];state.remarkStyle=0x80007d08;}
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

export function originalDescribedStandardPhrase(q,names,locationContext,readResource){
 return originalStandardPhrase(q,(event,state)=>{
  if(event.address===0x466fb0){state.sourceText=originalActorName({...names,actorId:event.args[0],actor:state.actors[event.args[0]],sourceText:state.sourceText,appendComma:event.args[1]!==0});return state;}
  const context=locationContext(structuredClone(state)),[c,r,type]=event.args;
  return originalLocationDescription({...context,c,r,type,state},context.map).state;
 },readResource);
}

function ctext(value){if(typeof value!=='string')throw Error('Original phrase text is unavailable.');return value.split('\0',1)[0];}
