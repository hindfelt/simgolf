const signedByte=n=>(n<<24)>>24;
// 0x469330–0x4694a0, before standard phrase cases or common postprocessing.
export function originalPhraseEntry(q){
 const state=structuredClone(q.state),hole=Math.trunc((q.combined|0)/11);
 state.redirected=false;
 if(q.actorId===152){const narrator=state.actors[152];if(!(narrator instanceof Uint8Array)||narrator.length!==256)throw Error('Original narrator record is unavailable.');narrator.fill(0);}
 if(q.actorId>=152)return {state,hole,next:'standard'};
 const actor=state.actors[q.actorId];if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original phrase actor record is unavailable.');
 const profile=new DataView(actor.buffer,actor.byteOffset,actor.byteLength).getInt16(0xb6,true);
 for(let index=0;index<q.requestCodes.length;index++){
  const code=signedByte(q.requestCodes[index]);
  if(index>0&&code===-1)return {state,hole,next:'standard'};
  if(code===(q.kind|0)){
   const phrase=q.profilePhrases[profile]?.[index];if(typeof phrase!=='string')throw Error('Original profile phrase data is unavailable.');
   const value=phrase.split('\0',1)[0];if(value){state.sourceText=state.sourceText.split('\0',1)[0]+value;return {state,hole,next:'postprocess'};}
  }
 }
 throw Error('Original phrase request table is missing its terminator.');
}
