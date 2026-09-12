import {ORIGINAL_HOLE_NAMES} from './original-hole-name-data.js';
// 0x407050 and its custom-name helper 0x45b2c0.
export function originalHoleDescription(q){
 const state=structuredClone(q.state),h=q.holeIndex|0,events=[];
 if(typeof state.sourceText!=='string')throw Error('Original hole description requires a text buffer.');
 const append=text=>{if(typeof text!=='string')throw Error('Original hole name is unavailable.');state.sourceText=state.sourceText.split('\0',1)[0]+text.split('\0',1)[0];};
 const record=index=>{const r=q.holeRecords?.[index];if(!(r instanceof Uint8Array)||r.length!==520)throw Error('Original hole name record is unavailable.');return r;};
 if(record(h+1)[0]&0x81){
  events.push({address:0x45b2c0,args:[h]});let offset=-1;
  if(h!==-1){const raw=q.holeNameOffsets?.[h];if(!Number.isInteger(raw))throw Error('Original hole name offset is unavailable.');offset=(raw<<16)>>16;}
  if(offset!==-1){append(q.holeNameStrings?.[offset]);return {state,events};}
  const par=(record(h)[8]<<24)>>24;append(ORIGINAL_HOLE_NAMES[par===3?3:par===4?4:5][h]);
 }else{
  append('Hole ');events.push({address:0x4acb95,args:[h,0x588f78,10]});append(String(h));
 }
 return {state,events};
}
