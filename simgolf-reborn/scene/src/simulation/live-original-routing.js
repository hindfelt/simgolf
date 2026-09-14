import {originalPathCost} from './original-path-cost.js';
// Recovered reverse-wave relaxation on the live map. Unlike the retail search,
// water/buildings are hard barriers, distances do not wrap at 255, and the queue
// grows to fit purchased land. Those are explicit live-world safety bindings.
const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
export function liveOriginalRoute({width,height,start,end,surfaceAt,walkingCost,heightAt,occupied=()=>false,center,from,to,edgeAllowed=()=>true}){
 const count=width*height,index=(x,z)=>z*width+x,valid=(x,z)=>x>=0&&z>=0&&x<width&&z<height;
 const surfaces=Array.from({length:count},(_,i)=>surfaceAt(i%width,Math.floor(i/width)));
 const heights=Float64Array.from(surfaces,(_,i)=>heightAt(i%width,Math.floor(i/width)));
 const walkCosts=Float64Array.from(surfaces,s=>Math.max(1,Math.round(walkingCost(s))));
 const pass=(x,z)=>valid(x,z)&&!['water','blocked','tree'].includes(surfaces[index(x,z)]);
 const sk=index(start.c,start.r),ek=index(end.c,end.r);
 if(!Number.isFinite(walkCosts[sk]))walkCosts[sk]=1;
 const costs=new Float64Array(count).fill(Infinity),parent=new Int32Array(count).fill(-1),queued=new Uint8Array(count);
 const queue=[ek];costs[ek]=1;queued[ek]=1;
 const pathFlags=s=>['path','bridge'].includes(s)?32:0;
 for(let head=0;head<queue.length;head++){
  const k=queue[head],x=k%width,z=Math.floor(k/width);queued[k]=0;
  for(let d=0;d<8;d++){
   const nx=x+DX[d],nz=z+DZ[d];
   if(!pass(nx,nz)&&!(nx===start.c&&nz===start.r))continue;
   if((d&1)&&(!pass(x+DX[d],z)||!pass(x,z+DZ[d])))continue;
   const nk=index(nx,nz),s=surfaces[nk];
   if(nk===sk&&!edgeAllowed(from,center(x,z)))continue;
   const slope=Math.abs(heights[nk]-heights[k]);
   const next=originalPathCost({traversalCost:walkCosts[nk],diagonal:!!(d&1),
    occupied:occupied(nx,nz),flags:pathFlags(s),currentFlags:pathFlags(surfaces[k]),direction:d,x:nx,z:nz,
    destination:{x:end.c,z:end.r},code:s==='tee'?0:s==='green'?1:2,metadataClass:0,currentCost:costs[k]})+slope*.4;
   if(next>=costs[nk])continue;
   costs[nk]=next;parent[nk]=k;
   if(!queued[nk]){queued[nk]=1;queue.push(nk);}
  }
 }
 if(!Number.isFinite(costs[sk]))return null;
 const route=[];let k=sk;
 for(let n=0;k!==ek&&n<count;n++){
  k=parent[k];if(k<0)return null;
  route.push(center(k%width,Math.floor(k/width)));
 }
 if(k!==ek)return null;
 if(route.length&&route.at(-1).x===to.x&&route.at(-1).z===to.z)route[route.length-1]={...to};
 else route.push({...to});
 return route;
}
