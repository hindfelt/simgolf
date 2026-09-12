import {originalHeading} from './original-heading.js';
// 0x423863–0x4239cf: consume the target/flag/score map returned by route search.
export function originalAutoTargetResult(q,scoreAt) {
 const offset=q.cornerTarget?0:512;
 const dx=(((q.target.x<<10)-q.x)+offset)|0,dz=(((q.target.z<<10)-q.z)+offset)|0;
 const actorFlags=q.cornerTarget?(q.actorFlags|0x10000000)>>>0:(q.actorFlags&0xefffffff)>>>0;
 let score=q.score;
 if(q.skillMask&4){
  const center=scoreAt(q.target.x,q.target.z);score=center;
  for(const [x,z] of [[0,-1],[1,0],[0,1],[-1,0]]){
   const opposite=scoreAt(q.target.x-x,q.target.z-z);
   const correction=Math.trunc((opposite-center)/4);
   score=Math.min(score,scoreAt(q.target.x+x,q.target.z+z)-correction);
  }
 }
 // This branch calculates heading from the yard-scaled vector, unlike the
 // initial target setup which calculates heading before this truncation.
 const sx=Math.imul(dx,25)>>10,sz=Math.imul(dz,25)>>10;
 const square=(Math.imul(sx,sx)+Math.imul(sz,sz))|0;
 return {dx,dz,actorFlags,score,heading:originalHeading(sx,sz),distance:square<0?-2147483648:Math.trunc(Math.sqrt(square))};
}
