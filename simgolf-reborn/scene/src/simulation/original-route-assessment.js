import {originalHeading} from './original-heading.js';
import {originalMapDistance} from './original-route-distance.js';
import {originalProjection} from './original-projection.js';
const dx=[0,1,1,1,0,-1,-1,-1],dz=[-1,-1,0,1,1,1,0,-1];
// Original prospective-route assessor 0x421450–0x42186f. terrainAt supplies
// original metadata, including padded/outside-map reads if a projection exits.
export function originalRouteAssessment({landing,cup,range,shape,flag,terrainAt}) {
 if(!landing||![landing.x,landing.z].every(n=>Number.isInteger(n)&&n>=0&&n<51200)||
   !cup||![cup.x,cup.z].every(n=>Number.isInteger(n)&&n>=0&&n<50)||
   !Number.isInteger(range)||range<0||range>330||![-1,0,1].includes(shape)||
   !Number.isInteger(flag)||typeof terrainAt!=='function')throw Error('Invalid original route assessment.');
 const delta={x:cup.x*1024+512-landing.x,z:cup.z*1024+512-landing.z};
 const heading=originalHeading(delta.x,delta.z),facing=(((heading>>>28)+1)>>1)&7;
 const span=(originalMapDistance(delta.x,delta.z)+512)>>10;
 const reach=Math.min(span,Math.trunc(range/25)+1);
 let curve=Math.imul(reach*shape,0x15555554),cost=0,obstacles=0;
 const at=(x,z)=>{
   const t=terrainAt({x,z});
   if(!t||!Number.isInteger(t.code)||!Number.isInteger(t.shotClass)||!Number.isInteger(t.kind))throw Error('Invalid original assessment terrain.');
   return {...t,shotClass:t.code===1?0:t.shotClass};
 };
 for(let i=0;i<=span;i++) {
   let turn=0;
   if(shape) {
     if(i<=Math.trunc(reach/2))turn=Math.imul(shape,0x0ffffffc);
     else if(i<reach)turn=Math.trunc(curve/Math.trunc((reach+1)/2));
   }
   let p=originalProjection((heading+turn)>>>0,i*1024);
   let x=landing.x+p.x,z=landing.z-p.z;
   if(shape&&i>Math.trunc(reach/2)&&i<reach) {
     p=originalProjection((heading-Math.imul(shape,0x15555554))>>>0,(reach-i)*1024);
     x=cup.x*1024+512-p.x;z=cup.z*1024+512+p.z;
   }
   const subX=(x%1024)>>4,subZ=(z%1024)>>4,tileX=x>>10,tileZ=z>>10;
   const t=at(tileX,tileZ),tail=reach<=5?1:reach>=9?3:2;
   if((i>=reach-tail&&!flag)||t.kind===13) {
     if(t.shotClass>0)cost+=t.shotClass;
     if(t.kind===13)cost+=Math.trunc(32/(i+1));
     if(t.code===17||t.code===20||tileX<0||tileX>=50||tileZ<0||tileZ>=50)cost+=16;
     if(subX<15&&dz[facing])cost+=Math.trunc(at(tileX-1,tileZ).shotClass/2);
     if(subX>48&&dz[facing])cost+=Math.trunc(at(tileX+1,tileZ).shotClass/2);
     if(subZ<15&&dx[facing])cost+=Math.trunc(at(tileX,tileZ-1).shotClass/2);
     if(subZ>48&&dx[facing])cost+=Math.trunc(at(tileX,tileZ+1).shotClass/2);
   }
   p=originalProjection(heading,i*1024+512);
   if(at((landing.x+p.x)>>10,(landing.z-p.z)>>10).kind===13)obstacles++;
   curve=(curve+Math.imul(shape,0xeaaaaaac))|0;
 }
 return Math.max(0,cost+(obstacles>=2?1:0));
}
