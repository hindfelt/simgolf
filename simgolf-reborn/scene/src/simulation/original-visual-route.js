import {originalRandom} from './original-rng.js';
import {originalHeading} from './original-heading.js';
import {originalPathfinder} from './original-pathfinder.js';
const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
// 0x403488–0x403634. Locals retain the caller's deltas even on return-home.
export function originalVisualRoute(snapshot,slot,locals,resolve=routeSearch){
 let state=structuredClone(snapshot);const calls=[];let randomDraws=0;
 function record(){const b=state.visualRecords?.[slot];if(!Number.isInteger(slot)||slot<0||slot>=64||!(b instanceof Uint8Array)||b.length!==76)throw Error('Original visual route slot unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 let r=record();if(!locals||![locals.x,locals.z,locals.dx,locals.dz].every(Number.isInteger))throw Error('Original visual route locals unavailable.');
 let {x,z}=locals;
 if(r.getUint8(0x12)&16){
  if(!state.clubhouse||![state.clubhouse.x,state.clubhouse.z,state.phaseCounter].every(Number.isInteger))throw Error('Original visual clubhouse unavailable.');
  x=((state.clubhouse.x<<10)+512)|0;z=((state.clubhouse.z<<10)+512)|0;
  if(((state.phaseCounter+slot*35)|0)%100===0){r.setUint8(0x15,7);r.setUint8(0x14,35);}
  const ax=Math.abs((x-r.getInt32(0,true))|0)|0,az=Math.abs((z-r.getInt32(4,true))|0)|0;
  if(Math.trunc(((ax>az?az+Math.imul(ax,2):ax+Math.imul(az,2))|0)/2)<1536)r.setUint8(0x12,0);
 }
 if(r.getInt16(0x18,true)!==0)return {state,calls,randomDraws,next:'0x403634'};
 if(!Number.isInteger(state.worldFlags))throw Error('Original visual routing flags unavailable.');
 state.worldFlags=(state.worldFlags|256)>>>0;
 const event={address:0x42def0,args:[x,z,r.getInt32(0,true),r.getInt32(4,true),slot]};calls.push(event);
 const reply=resolve(structuredClone(event),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous visual pathfinder state.');
 state=structuredClone(reply.state);r=record();
 const direction=reply.value&255;if(!Number.isInteger(reply.value)||(direction>7&&direction!==255))throw Error('Original visual route direction unavailable.');
 r.setUint8(0x16,direction);state.worldFlags=(state.worldFlags&~256)>>>0;
 if(direction!==255){
  const subX=(r.getInt32(0,true)>>6)&15,subZ=(r.getInt32(4,true)>>6)&15;
  let budget=DX[direction]===1?24-subX:DX[direction]===-1?subX+8:DZ[direction]===1?24-subZ:subZ+8;
  if((direction&1)&&budget>16)budget=16;r.setInt16(0x18,budget,true);
 }else{
  r.setUint8(0x16,((((originalHeading(locals.dx,locals.dz)>>28)&15)+1)>>1)&7);r.setInt16(0x1e,11,true);
  const rng=originalRandom(state.seed);r.setInt16(0x1a,rng.next(16)+1,true);state.seed=rng.state;randomDraws=rng.draws;
 }
 return {state,calls,randomDraws,next:r.getInt16(0x18,true)===0?'skip':'0x403634'};
}
function routeSearch(event,state){
 const [x,z,ox,oz,actorId]=event.args;
 const out=originalPathfinder({...state,actorId,origin:{x:ox,z:oz},destination:{x,z}});
 if(out.next!=='return')throw Error('Original visual pathfinder debug continuation required.');
 for(const field of ['actorId','origin','destination']){if(Object.hasOwn(state,field))out.state[field]=state[field];else delete out.state[field];}
 return {state:out.state,value:out.value};
}
