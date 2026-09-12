// Full 0x40a6c0 helper, including unsigned out-of-range no-append behavior.
export function originalClubName(q){
 const state=structuredClone(q.state),id=q.clubId>>>0;
 if(typeof state.sourceText!=='string')throw Error('Original club name requires a text buffer.');
 if(id<=13)state.sourceText=state.sourceText.split('\0',1)[0]+['Driver','3 Wood','4 Wood','2 Iron','3 Iron','4 Iron','5 Iron','6 Iron','7 Iron','8 Iron','9 Iron','Lob Wedge','Sand Wedge','Putter'][id];
 return state;
}
