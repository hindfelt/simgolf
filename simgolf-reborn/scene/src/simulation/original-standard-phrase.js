import {ORIGINAL_FIXED_PHRASES as fixed,ORIGINAL_STANDARD_PHRASE_STRINGS as labels} from './original-standard-phrase-data.js';
// Standard dispatch starts at 0x469380. Unrecovered cases fail explicitly;
// they must never silently become generic phrases in the fidelity engine.
export function originalStandardPhrase(q){
 const state=structuredClone(q.state),kind=q.kind|0;
 if(typeof state.sourceText!=='string')throw Error('Original standard phrase requires a text buffer.');
 state.remarkStyle=0x80006318;
 if(((kind-1)>>>0)>64||kind===64)return {state,next:'postprocess'};
 const record=fixed[kind];let addresses=[];
 if(record){addresses=record.addresses;state.remarkStyle=record.style;}
 else if(kind===36){addresses=[(q.value|0)!==0?0x4e2138:0x4e211c];state.remarkStyle=0x80007d08;}
 else if(kind===41)addresses=[(q.actorId&1)?0x4e2080:0x4e206c];
 else if(kind===47){addresses=[actor(q)[0xb6]&1?0x4e2a74:0x4e2a58];state.remarkStyle=0x800023e8;}
 else if(kind===63){const staff=(actor(q)[0x18]&0xe0)===0x20;addresses=[(staff?[0x4e2bf4,0x4e2bcc,0x4e2ba8,0x4e2b84]:[0x4e2b60,0x4e2b30,0x4e2afc,0x4e2ad0])[q.actorId&3]];}
 else if(kind===65){if(!Number.isInteger(q.originalMode))throw Error('Original standard phrase mode is unavailable.');addresses=[0x4e2864];if((q.originalMode|0)>1)state.remarkStyle=0x80007d08;}
 else throw Error(`Original standard phrase case ${kind} is not reconstructed yet.`);
 state.sourceText=state.sourceText.split('\0',1)[0]+addresses.map(a=>labels['0x'+a.toString(16)]).join('');
 return {state,next:'postprocess'};
}
function actor(q){const value=q.state.actors?.[q.actorId];if(!(value instanceof Uint8Array)||value.length!==256)throw Error('Original standard phrase actor is unavailable.');return value;}
