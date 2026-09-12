// 0x423496–0x4234db: diagnostics are refreshed only on the four-sample pass.
export function originalRouteDiagnostics(q) {
 if(q.samples!==4)return q.diagnostics;
 if(((q.maxDistance-q.minDistance)|0)>75)return 1;
 return ((q.maxHeading-q.minHeading)|0)>0x15555555?2:0;
}
// 0x423516–0x4235b7: publish winner (or cup fallback), then restore search state.
export function originalRouteFinish(q) {
 const found=q.winner.target.x!==-1;
 return {target:{...(found?q.winner.target:q.cup)},curve:found?q.winner.curve:0,
  cornerTarget:found?q.cornerTarget:0,
  diagnostics:found&&q.winner.landingFlag?(q.diagnostics|4):q.diagnostics,
  worldFlags:(q.worldFlags&0xff7fffff)>>>0,mode:q.mode===2?2:0,candidateSkillMask:7};
}
