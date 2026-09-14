import {ORIGINAL_STANDARD_PHRASE_STRINGS as labels} from './original-standard-phrase-data.js';
// Complete 0x469250: original value category and signed score-to-par suffix.
export function originalScoreComment(q){
 const state=structuredClone(q.state),v=q.value|0,d=q.relativeScore|0;
 if(typeof state.sourceText!=='string')throw Error('Original score comment requires a text buffer.');
 const address=v>=0&&v<6?[0x4e1a2c,0x4e1a0c,0x4e19ec,0x4e19cc,0x4e19a8,0x4e198c][v]:v===6?(d>1?0x4e1948:0x4e196c):v===7?(d>=1?0x4e1910:0x4e192c):v>=8&&v<=127?(d>=1?0x4e18c0:0x4e18e8):0x4e189c;
 state.sourceText=state.sourceText.split('\0',1)[0]+labels['0x'+address.toString(16)];return state;
}
