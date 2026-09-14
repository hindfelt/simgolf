import {originalHeading} from './original-heading.js';
import {originalMapDistance,originalRouteSegment} from './original-route-distance.js';
import {originalSine} from './original-ball-position.js';
// Native 0x42ceb2–0x42d110. The caller retains the pre-drop tile/terrain
// locals for subsequent reactions, even when this stage relocates the ball.
export function originalHazardDrop(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId,terrain=snapshot.landingTerrain,tile=snapshot.landingTile;let candidates=0;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original hazard actor is unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function codeAt(x,z){if(x<0||z<0||x>=50||z>=50)return 20;if(!(state.terrain instanceof Uint8Array)||state.terrain.length!==2500)throw Error('Original hazard terrain is unavailable.');return (state.terrain[x*50+z]<<24)>>24;}
 function call(address,args){if(typeof resolve!=='function')throw Error('Original hazard effect requires an explicit resolver.');const event={address,args};calls.push(event);const reply=resolve(structuredClone(event),structuredClone(state));if(!reply?.state||typeof reply.then==='function')throw Error('Expected synchronous original hazard effect state.');state=structuredClone(reply.state);}
 if(!Number.isInteger(terrain)||!tile||![tile.x,tile.z].every(Number.isInteger)||![0,1].includes(snapshot.centreFlag))throw Error('Original hazard locals are unavailable.');
 const invalid=codeAt(tile.x,tile.z)===20;
 if(terrain!==17&&!invalid&&!snapshot.centreFlag)return {state,calls,candidates,penalty:false,next:'0x42d110'};
 let a=actor();
 if(terrain!==17&&!snapshot.centreFlag){
  call(0x4672d0,[id,2,terrain]);a=actor();a.setInt32(0xdc,a.getInt32(0xcc,true),true);a.setInt32(0xe0,a.getInt32(0xd0,true),true);
 }else{
  call(0x40c1f0,[5,a.getInt32(0xdc,true),a.getInt32(12,true),0]);call(0x4672d0,[id,13,terrain]);a=actor();
  const from={x:a.getInt32(0xcc,true),z:a.getInt32(0xd0,true)},ball={x:a.getInt32(0xdc,true),z:a.getInt32(0xe0,true)};
  const dx=(ball.x-from.x)|0,dz=(ball.z-from.z)|0,heading=originalHeading(dx,dz),length=originalMapDistance(dx,dz);
  const cup=state.holeTargets?.[a.getInt8(0x29)],cupDistance=originalRouteSegment(ball,cup);
  a.setInt32(0xdc,from.x,true);a.setInt32(0xe0,from.z,true);let best=-99;
  for(let distance=0;distance<length;distance+=512){
   candidates++;
   const point={x:(from.x+originalSine(heading,distance))|0,z:(from.z-originalSine((heading+0x40000000)>>>0,distance))|0};
   if(distance!==0&&originalRouteSegment(point,cup)<cupDistance)continue;
   const code=codeAt(point.x>>10,point.z>>10);if(code===17||code===10)continue;
   const scatter=state.metadata?.[code]?.scatterCoefficient;
   if(!Number.isInteger(scatter)||scatter< -128||scatter>127)throw Error('Original drop terrain metadata is unavailable.');
   const score=(distance-(scatter<<2))|0;
   if(score<=best)continue;best=score;a.setInt32(0xdc,point.x,true);a.setInt32(0xe0,point.z,true);
   if(distance!==0)a.setUint32(0x18,a.getUint32(0x18,true)|0x400,true);
  }
 }
 a=actor();if(a.getUint8(0x25)!==13){a.setUint8(0x25,13);a.setUint8(0x22,(a.getUint8(0x22)-2)&7);}
 a.setInt16(0xa6,-99,true);a.setUint32(0x18,a.getUint32(0x18,true)|1,true);
 if(a.getInt8(0x2a)<8)a.setUint8(0x2a,a.getUint8(0x2a)+1);
 return {state,calls,candidates,penalty:true,next:'0x42d110'};
}
