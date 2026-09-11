import {originalRandom} from './original-rng.js';
import {originalProjection} from './original-projection.js';
const dx=[0,1,1,1,0,-1,-1,-1],dz=[-1,-1,0,1,1,1,0,-1];
// Non-putter automatic scenery sampling, 0x4249b3–0x424c46.
// Map metadata and object lookup remain explicit original-record boundaries.
export function originalAutoScenery(q,map) {
 const state=structuredClone(q.state),rng=originalRandom(state.seed);
 state.holeCounter=(state.holeCounter+1)|0;
 let samples=0;
 const count=()=>Math.trunc((map.heightAt(q.origin.x,q.origin.z)<<4)/(q.conditionLevel+2));
 while(samples<count()){
  const heading=(q.heading+((12-rng.next(25))<<24))>>>0;
  const distance=(q.distance-rng.next(200)+100)|0;
  if(distance>=0){
   const p=originalProjection(heading,Math.trunc(distance/25)<<10);
   const x=((q.position.x+p.x)|0)>>10,z=((q.position.z-p.z)|0)>>10;
   const facing=((((heading|0)>>28)+1)>>1)&7;
   state.pathHeading=facing;
   if(x>=0&&z>=0&&x<50&&z<50){
    const code=map.terrainAt(x,z),index=z*50+x;
    const behindKind=()=>map.kindAt(map.terrainAt(x-dx[facing],z-dz[facing]));
    if((map.marksAt(x,z)&0x100)||code===19){
     const ceiling=map.heightAt(q.origin.x,q.origin.z)+1;
     if(map.heightAt(x,z)<=ceiling&&behindKind()!==13)state.sceneryTile=index;
    }
    if(map.categoryAt(code)===16&&behindKind()!==13){
     const recordIndex=map.objectIndexAt(x,z);
     if(code===21){
      const record=recordIndex===-1?null:map.objectAt(recordIndex);
      if(record?.type===5&&record.value)state.namedReference=record.value;
      else state.scannedTile=index;
     }else{
      // Original reads index -1 here too; the caller supplies that backing record.
      const record=map.objectAt(recordIndex);
      if(record.type===4){
       if(record.value<16)state.sceneryTile=index;
       else state.scannedTile=index;
      }
     }
    }
   }
  }
  samples++;
 }
 return {...state,seed:rng.state,samples,randomDraws:rng.draws};
}
