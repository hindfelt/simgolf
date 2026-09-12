import {originalHeading} from './original-heading.js';
import {originalWalkingOctant} from './original-walking-near-steering.js';
import {originalPathfinderSelection} from './original-pathfinder-selection.js';
const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
const tile=n=>Math.max(0,Math.min(49,n>>10));
// 0x42def0–0x42e25a, followed by the recovered selector. Debug display is explicit.
export function originalPathfinder(snapshot){
 const state=structuredClone(snapshot),{terrain,tileFlags,traversalCosts,metadataClass}=state;
 for(const [a,T] of [[terrain,Uint8Array],[tileFlags,Uint16Array],[traversalCosts,Int8Array]])if(!(a instanceof T)||a.length!==2500)throw Error('Expected original pathfinding map.');
 if(!(metadataClass instanceof Uint8Array)||metadataClass.length<128)throw Error('Expected original terrain metadata.');
 const id=state.actorId;
 function actor(i){const b=state.actors?.[i];if(!(b instanceof Uint8Array)||b.length!==256)throw Error('Expected original routing actor.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 if(!Number.isInteger(id)||id<0||id>=152)throw Error('Expected original routing actor ID.');
 const own=actor(id),other=actor(id^1),rawOrigin=state.origin,rawDestination=state.destination;
 for(const p of [rawOrigin,rawDestination])if(!p||![p.x,p.z].every(n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647))throw Error('Expected original coordinates.');
 const origin={x:tile(rawOrigin.x),z:tile(rawOrigin.z)},destination={x:tile(rawDestination.x),z:tile(rawDestination.z)},partner={x:tile(other.getInt32(8,true)),z:tile(other.getInt32(12,true))};
 const visited=new Uint8Array(2500);state.visited=visited;
 if(origin.x===destination.x&&origin.z===destination.z)return {state,value:originalWalkingOctant((rawDestination.x-rawOrigin.x)|0,(rawDestination.z-rawOrigin.z)|0),next:'return'};
 if(partner.x===destination.x&&partner.z===destination.z)partner.x=-1;
 const dx=destination.x-origin.x,dz=destination.z-origin.z;
 const h=((((originalHeading(dx,dz)>>28)+1)^-7)>>1)&7,preferredMask=(1<<((h+1)&6))|(1<<(h&6));
 const queueX=state.queueX??new Int16Array(1024),queueZ=state.queueZ??new Int16Array(1024);
 if(!(queueX instanceof Int16Array)||queueX.length!==1024||!(queueZ instanceof Int16Array)||queueZ.length!==1024)throw Error('Expected original ring queue.');
 state.queueX=queueX;state.queueZ=queueZ;queueX[0]=destination.x;queueZ[0]=destination.z;visited[destination.x*50+destination.z]=1;
 let head=0,tail=1,limit=state.worldFlags&256?250:160;
 do{
  const x=queueX[head],z=queueZ[head];head=(head+1)&1023;
  const current=x*50+z,currentCost=visited[current];
  if(currentCost<=limit)for(let d=0;d<8;d++){
   const nx=x+DX[d],nz=z+DZ[d];if(nx<0||nx>=50||nz<0||nz>=50)continue;
   const i=nx*50+nz,previous=visited[i],code=terrain[i];let cost=traversalCosts[i]+(d&1);
   if(nx===partner.x&&nz===partner.z)cost+=2;
   if(!(d&1)&&(tileFlags[i]&0x420)===32&&(tileFlags[current]&32)){
    const a=nx-destination.x,b=nz-destination.z,cardinal=Math.abs(a)>Math.abs(b)?(a>0?2:6):(b>0?4:0);
    cost=d===cardinal?0:1;
   }
   if((state.worldFlags&256)||own.getUint8(0x29)===19){
    if(code>=128)throw Error('Signed terrain metadata before table is unavailable.');
    cost=code===0||code===1||code===2||metadataClass[code]===7?cost+1:(cost+1)>>1;
   }
   if((code===17||code===20)&&!(tileFlags[i]&32)&&currentCost<64)cost+=16;
   cost+=currentCost;if((previous!==0&&previous<=cost)||cost>255)continue;
   visited[i]=cost;queueX[tail]=nx;queueZ[tail]=nz;tail=(tail+1)&1023;
   if(nx===origin.x&&nz===origin.z)limit=cost;
  }
 }while(head!==tail&&!state.abortSearch);
 const locals={origin,destination,preferredMask,fallbackDelta:{x:dz,z:dx},actorPosition:{x:own.getInt32(8,true),z:own.getInt32(12,true)}};
 if(state.worldFlags&0x1000)return {state,locals,next:'0x42e25a'};
 const selected=originalPathfinderSelection({...state,...locals});
 // Keep caller coordinates; selector's tile locals are not world-state fields.
 state.worldFlags=selected.state.worldFlags;
 return {state,value:selected.value,next:'return'};
}
