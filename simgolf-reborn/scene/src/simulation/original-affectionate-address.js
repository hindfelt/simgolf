// Complete 0x466e30 helper: actor identity selects a familiar form of address.
export function originalAffectionateAddress(q){
 const state=structuredClone(q.state);
 if(typeof state.sourceText!=='string')throw Error('Original form of address requires a text buffer.');
 state.sourceText=state.sourceText.split('\0',1)[0]+[', honey',', sugar',', dear',', sweetie'][q.actorId&3];
 return state;
}
