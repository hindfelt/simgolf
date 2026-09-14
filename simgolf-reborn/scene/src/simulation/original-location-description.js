import {originalBuildingDescription} from './original-building-description.js';
import {ORIGINAL_LOCATION_STRINGS as labels} from './original-location-strings.js';
const signedByte=n=>(n<<24)>>24;
// 0x4074d0, with explicit original tile/object records and region globals.
export function originalLocationDescription(q,map,describeBuilding=(event,state)=>originalBuildingDescription({buildingId:event.args[0],detailed:event.args[1],state})){
 let state=structuredClone(q.state),c=q.c|0,r=q.r|0,t=q.type|0;const events=[];
 const object=id=>{const value=q.objects[id];if(!value)throw Error('Original location object is unavailable.');return value;};
 if(t===-1)t=signedByte(map.tileAt(c,r));
 else if(t&0x100){const item=object(t&255);c=(item.c<<16)>>16;r=(item.r<<16)>>16;t=signedByte(map.tileAt(c,r));}
 let address;
 if(t===21||t===22){
  const item=object(map.detailAt(c,r)&255);
  if(item.type===4){const event={address:0x407270,args:[item.value|0,0]};events.push(event);if(typeof describeBuilding!=='function')throw Error('Original building description requires a resolver.');const reply=describeBuilding(structuredClone(event),structuredClone(state));if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative building state.');return {state:structuredClone(reply),events,result:1};}
  address=item.type===2?0x4c3c10:t===22?0x4c3930:0x4c3c04;
 }else{
  const raw=q.terrainTypes[t];if(!Number.isInteger(raw))throw Error('Original location terrain type is unavailable.');const type=signedByte(raw),region=q.environmentCode&255;
  if(type===21||type===22)address=0x4c3930;
  else if(type===19)address=0x4c3dd8;
  else if(type===18)address=0x4c3d98;
  else if(type===17){address=t===19?0x4c3dcc:(map.flagsAt(c,r)&0x20)?0x4c3dbc:(map.detailAt(c,r)&255)&&signedByte(map.tileAt(c,r))===17?0x4c3db4:region===1?0x4c3da4:0x4c3d98;}
  else if(type===13){address=t===16?0x4c3d8c:region===1?0x4c3d7c:t===13||t===14?0x4c3d8c:t===15?0x4c3d74:null;}
  else if(type===12)address=0x4c3da4;
  else if(type===7)address=0x4c3c28;
  else if(type!==4)address=0x4c3c1c;
  else if(t===10)address=region===1?0x4c3da4:0x4c3d8c;
  else if(t===12)address=region===1?0x4c3d64:0x4c3da4;
  else if(t!==4)address=q.worldType===13?0x4c3d58:0x4c3d4c;
  else if(!(map.flagsAt(c,r)&0x1000))address=q.worldType===10?0x4c3c5c:region===1?0x4c3c48:0x4c3c34;
  else{
   const variant=(map.detailAt(c,r)&255)%5;
   address=region===1?[0x4c3d3c,0x4c3d28,0x4c3d14,0x4c3d04,0x4c3cf4][variant]:region===2?[0x4c3ce4,0x4c3ccc,0x4c3cbc,0x4c3cac,0x4c3c9c][variant]:region===0||region===3?[0x4c3c8c,0x4c3c78,0x4c3d14,0x4c3c68,0x4c3c9c][variant]:null;
  }
 }
 if(address)state.sourceText=state.sourceText.split('\0',1)[0]+labels['0x'+address.toString(16)];
 return {state,events,result:1};
}
