const DX=[0,1,1,1,0,-1,-1,-1],DZ=[-1,-1,0,1,1,1,0,-1];
const abs32=n=>n<0?(-n)|0:n;
// 0x42e327–0x42e556. Consumes the original wavefront, not a substitute search.
export function originalPathfinderSelection(snapshot){
 const state=structuredClone(snapshot),{origin,destination,visited,terrain,tileFlags,actorPosition,fallbackDelta}=state;
 for(const p of [origin,destination])if(!p||![p.x,p.z].every(n=>Number.isInteger(n)&&n>=0&&n<50))throw Error('Expected original map tile.');
 for(const [a,T] of [[visited,Uint8Array],[terrain,Uint8Array],[tileFlags,Uint16Array]])if(!(a instanceof T)||a.length!==2500)throw Error('Expected complete original pathfinding map.');
 for(const p of [actorPosition,fallbackDelta])if(!p||![p.x,p.z].every(Number.isInteger))throw Error('Expected original coordinate pair.');
 const index=origin.x*50+origin.z,bridge=terrain[index]===17&&!!(tileFlags[index]&32);
 let direction=-1,best=visited[index]*2+1;
 for(let d=0;d<8;d++){
  const x=origin.x+DX[d],z=origin.z+DZ[d];if(x<0||x>=50||z<0||z>=50)continue;
  const i=x*50+z;if(terrain[i]===20||!visited[i]||(bridge&&(d&1)))continue;
  const score=visited[i]*2+(d&1)-((state.preferredMask&(1<<(d^4)))?1:0);
  if(score<best){best=score;direction=d;}
 }
 if(!(state.worldFlags&256)&&bridge&&direction>=0&&direction<=6){
  const x=(actorPosition.x-(origin.x<<10)-512)|0,z=(actorPosition.z-(origin.z<<10)-512)|0,previous=direction;
  if(direction===0&&abs32(x)>256)direction=x>0?7:1;
  if(previous===2&&abs32(z)>256)direction=z>0?1:3;
  if(previous===4&&abs32(x)>256)direction=x>0?5:3;
  if(previous===6&&abs32(z)>256)direction=z>0?7:5;
  if(direction!==previous)state.worldFlags=(state.worldFlags|0x80000)>>>0;
 }
 if(direction===-1&&(origin.x!==destination.x||origin.z!==destination.z)){
  const {x,z}=fallbackDelta;
  direction=abs32(z)>abs32(x)?(z>0?2:6):(x>0?4:0);
 }
 return {state,value:direction};
}
