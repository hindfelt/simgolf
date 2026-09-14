const suffix=n=>n===0?'':[' II',' III',' IV',' V',' VI',' VII',' VIII',' IX'][n-1]||' X';
const string=value=>{if(typeof value!=='string')throw Error('Original actor name data is unavailable.');return value.split('\0',1)[0];};
// Complete 0x466fb0. Name tables and club globals are explicit snapshot inputs.
export function originalActorName(q){
 const actor=q.actor;if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original actor naming requires a packed record.');
 const status=actor[0x18],kind=status&0xe0,subtype=status&0x1f;let name;
 switch(kind){
  case 0x20:name=subtype===4?q.profileNames[0]:q.staffNames[actor[0xbb]];break;
  case 0x40:name=string(q.clubName)+suffix(q.clubSequence&0x7f);break;
  case 0x60:name=string(q.secondaryName)+suffix(subtype);break;
  case 0x80:name=(q.actorId&1)?'Ivana Richman':'Agnes Heffledorp';break;
  default:name=q.profileNames[new DataView(actor.buffer,actor.byteOffset,actor.byteLength).getInt16(0xb6,true)];
 }
 return string(q.sourceText)+(q.appendComma?', ':'')+string(name);
}
