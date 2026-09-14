// 0x422bcf–0x422c34: one simulated shot, preserving original work accounting.
export function originalRouteSample(q,simulate) {
 const offset=q.cornerTarget?0:512;
 const result=simulate({actorId:q.actorId,x:((q.target.x<<10)+offset)|0,
  z:((q.target.z<<10)+offset)|0,curve:q.curve},
  {mode:q.mode,target:q.cup,worldFlags:q.worldFlags});
 return {result,work:q.cornerTarget?q.work:(q.work+1)|0};
}
